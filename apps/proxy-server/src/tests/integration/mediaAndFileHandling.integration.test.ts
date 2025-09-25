/**
 * Media and File Handling Integration Tests
 * Testing file upload, media processing, and cross-format compatibility
 * Using t-WADA naming conventions and production types
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { Server } from 'http';
import { Database as DatabaseType } from 'better-sqlite3';
import { createReadStream, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { promisify } from 'util';
import { exec } from 'child_process';
import { 
  TRPGCampaign, 
  TRPGCharacter, 
  MediaFile,
  APIResponse 
} from '@ai-agent-trpg/types';
import { campaignsRouter } from '../../routes/campaigns';
import { charactersRouter } from '../../routes/characters';
import { mediaRouter } from '../../routes/media';
import { errorHandler } from '../../middleware/errorHandler';
import { mediaMiddleware } from '../../middleware/media.middleware';
import { fullIntegrationMockSetup, MockServerServices } from '../mocks';
import { testDatabase, TestDataFactory } from '../setup/testDatabase';

const execAsync = promisify(exec);

describe('Media and File Handling Integration Tests', () => {
  let app: Express;
  let server: Server;
  let db: DatabaseType;
  let mockServices: MockServerServices;
  const testMediaDir = join(__dirname, '../../../test-media');
  const testUploadsDir = join(__dirname, '../../../test-uploads');

  beforeAll(async () => {
    // Create test directories
    [testMediaDir, testUploadsDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });

    // Set up test database
    db = testDatabase.createTestDatabase();
    setupMediaTables(db);
    
    // Set up express app with media handling
    app = express();
    app.use(express.json());
    app.use('/api/media', mediaMiddleware.upload(), mediaRouter);
    app.use('/api/campaigns', campaignsRouter);
    app.use('/api/characters', charactersRouter);
    app.use(errorHandler);

    // Initialize mock services
    mockServices = await fullIntegrationMockSetup();
    
    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    await mockServices.cleanup();
    testDatabase.closeAllDatabases();
    server.close();
    
    // Cleanup test directories
    await execAsync(`rm -rf ${testMediaDir} ${testUploadsDir}`);
  });

  beforeEach(async () => {
    testDatabase.resetDatabase(db);
    setupMediaTables(db);
    await mockServices.reset();
    
    // Clear test directories
    await execAsync(`rm -rf ${testMediaDir}/* ${testUploadsDir}/*`);
  });

  describe('画像アップロードと処理', () => {
    it('Should handle multiple image formats with proper conversion and optimization', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Create test images in various formats
      const imageFormats = [
        { 
          format: 'jpeg',
          mimeType: 'image/jpeg',
          content: await createTestImage('jpeg', 1920, 1080)
        },
        { 
          format: 'png',
          mimeType: 'image/png',
          content: await createTestImage('png', 2048, 2048)
        },
        { 
          format: 'webp',
          mimeType: 'image/webp',
          content: await createTestImage('webp', 4096, 3072)
        },
        { 
          format: 'gif',
          mimeType: 'image/gif',
          content: await createTestGif(800, 600)
        },
        { 
          format: 'svg',
          mimeType: 'image/svg+xml',
          content: createTestSVG()
        },
        { 
          format: 'heic',
          mimeType: 'image/heic',
          content: await createTestImage('jpeg', 3000, 2000) // Simulate HEIC with JPEG
        }
      ];

      for (const img of imageFormats) {
        const response = await request(app)
          .post('/api/media/upload')
          .attach('file', img.content, {
            filename: `test-image.${img.format}`,
            contentType: img.mimeType
          })
          .field('type', 'character_portrait')
          .field('entityId', campaign.id)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.fileId).toBeDefined();
        expect(response.body.data.processedVariants).toBeDefined();

        // Verify processed variants
        const variants = response.body.data.processedVariants;
        expect(variants.thumbnail).toBeDefined();
        expect(variants.medium).toBeDefined();
        expect(variants.large).toBeDefined();
        
        // Check optimization
        expect(variants.original.size).toBeLessThanOrEqual(img.content.length);
        expect(variants.thumbnail.width).toBeLessThanOrEqual(150);
        expect(variants.thumbnail.height).toBeLessThanOrEqual(150);

        // Verify metadata extraction
        expect(response.body.data.metadata).toBeDefined();
        expect(response.body.data.metadata.format).toBeDefined();
        expect(response.body.data.metadata.width).toBeDefined();
        expect(response.body.data.metadata.height).toBeDefined();
        
        // SVG should preserve vector format
        if (img.format === 'svg') {
          expect(response.body.data.metadata.isVector).toBe(true);
        }

        // Verify database entry
        const mediaEntry = db.prepare('SELECT * FROM media_files WHERE id = ?')
          .get(response.body.data.fileId);
        expect(mediaEntry).toBeDefined();
        expect(JSON.parse(mediaEntry.variants)).toBeDefined();
      }
    });

    it('Should handle batch image uploads with progress tracking', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Create multiple test images
      const batchSize = 10;
      const images = await Promise.all(
        Array.from({ length: batchSize }, async (_, i) => ({
          name: `batch-image-${i}.jpg`,
          content: await createTestImage('jpeg', 800 + i * 100, 600 + i * 100)
        }))
      );

      // Start batch upload
      const batchStartResponse = await request(app)
        .post('/api/media/batch/start')
        .send({
          totalFiles: batchSize,
          sessionId: 'test-batch-session',
          metadata: {
            campaignId: campaign.id,
            uploadType: 'character_gallery'
          }
        })
        .expect(200);

      const batchId = batchStartResponse.body.data.batchId;
      expect(batchId).toBeDefined();

      // Upload images with progress tracking
      const uploadPromises = images.map(async (img, index) => {
        const response = await request(app)
          .post('/api/media/batch/upload')
          .attach('file', img.content, {
            filename: img.name,
            contentType: 'image/jpeg'
          })
          .field('batchId', batchId)
          .field('fileIndex', index.toString())
          .field('type', 'character_portrait');

        return response;
      });

      const uploadResults = await Promise.all(uploadPromises);

      // All uploads should succeed
      uploadResults.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });

      // Get batch status
      const batchStatusResponse = await request(app)
        .get(`/api/media/batch/${batchId}/status`)
        .expect(200);

      expect(batchStatusResponse.body.data.totalFiles).toBe(batchSize);
      expect(batchStatusResponse.body.data.uploadedFiles).toBe(batchSize);
      expect(batchStatusResponse.body.data.status).toBe('completed');
      expect(batchStatusResponse.body.data.processingStats).toBeDefined();
      expect(batchStatusResponse.body.data.processingStats.totalSize).toBeGreaterThan(0);
      expect(batchStatusResponse.body.data.processingStats.averageProcessingTime).toBeDefined();

      // Complete batch
      const batchCompleteResponse = await request(app)
        .post(`/api/media/batch/${batchId}/complete`)
        .expect(200);

      expect(batchCompleteResponse.body.data.createdMedia).toHaveLength(batchSize);
      expect(batchCompleteResponse.body.data.optimizationSavings).toBeGreaterThan(0);
    });

    it('Should validate and sanitize images for security', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Test malicious image scenarios
      const maliciousTests = [
        {
          name: 'EXIF with GPS data',
          content: await createImageWithEXIF(),
          expectedSanitization: 'exif_removed'
        },
        {
          name: 'Image with embedded JavaScript',
          content: createSVGWithScript(),
          expectedError: 'MALICIOUS_CONTENT'
        },
        {
          name: 'Polyglot file (JPEG+ZIP)',
          content: createPolyglotFile(),
          expectedError: 'INVALID_FILE_FORMAT'
        },
        {
          name: 'Image bomb (decompression bomb)',
          content: await createImageBomb(),
          expectedError: 'FILE_TOO_LARGE'
        }
      ];

      for (const test of maliciousTests) {
        const response = await request(app)
          .post('/api/media/upload')
          .attach('file', test.content, {
            filename: `${test.name}.jpg`,
            contentType: 'image/jpeg'
          })
          .field('type', 'character_portrait')
          .field('entityId', campaign.id);

        if (test.expectedError) {
          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe(test.expectedError);
        } else {
          expect(response.status).toBe(200);
          expect(response.body.data.sanitization).toContain(test.expectedSanitization);
          
          // Verify EXIF data was removed
          if (test.expectedSanitization === 'exif_removed') {
            const metadata = response.body.data.metadata;
            expect(metadata.gps).toBeUndefined();
            expect(metadata.camera).toBeUndefined();
          }
        }
      }

      // Verify security events are logged
      const securityLogs = db.prepare(`
        SELECT * FROM media_security_logs 
        WHERE event_type IN ('malicious_content', 'sanitization')
        ORDER BY created_at DESC
      `).all();

      expect(securityLogs.length).toBeGreaterThan(0);
    });
  });

  describe('動画とオーディオ処理', () => {
    it('Should handle video uploads with transcoding and thumbnail generation', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Create test video
      const testVideo = await createTestVideo('mp4', 10); // 10 second video

      const uploadResponse = await request(app)
        .post('/api/media/upload')
        .attach('file', testVideo, {
          filename: 'campaign-intro.mp4',
          contentType: 'video/mp4'
        })
        .field('type', 'campaign_video')
        .field('entityId', campaign.id)
        .field('processVideo', 'true')
        .expect(200);

      expect(uploadResponse.body.success).toBe(true);
      const videoData = uploadResponse.body.data;

      // Check video processing results
      expect(videoData.processedVariants).toBeDefined();
      expect(videoData.processedVariants.webOptimized).toBeDefined();
      expect(videoData.processedVariants.thumbnail).toBeDefined();
      expect(videoData.processedVariants.preview).toBeDefined();

      // Verify metadata
      expect(videoData.metadata.duration).toBeCloseTo(10, 1);
      expect(videoData.metadata.bitrate).toBeDefined();
      expect(videoData.metadata.codec).toBeDefined();
      expect(videoData.metadata.resolution).toBeDefined();

      // Check thumbnail generation
      expect(videoData.thumbnails).toBeDefined();
      expect(videoData.thumbnails.length).toBeGreaterThan(0);
      expect(videoData.thumbnails[0].timestamp).toBeDefined();
      expect(videoData.thumbnails[0].url).toBeDefined();

      // Test streaming endpoint
      const streamResponse = await request(app)
        .get(`/api/media/stream/${videoData.fileId}`)
        .expect(206); // Partial content for streaming

      expect(streamResponse.headers['content-type']).toBe('video/mp4');
      expect(streamResponse.headers['accept-ranges']).toBe('bytes');
      expect(streamResponse.headers['content-range']).toBeDefined();
    });

    it('Should process audio files with waveform generation', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Create test audio files
      const audioFormats = [
        { format: 'mp3', mimeType: 'audio/mpeg' },
        { format: 'wav', mimeType: 'audio/wav' },
        { format: 'ogg', mimeType: 'audio/ogg' },
        { format: 'm4a', mimeType: 'audio/mp4' }
      ];

      for (const audio of audioFormats) {
        const testAudio = await createTestAudio(audio.format, 30); // 30 second audio

        const response = await request(app)
          .post('/api/media/upload')
          .attach('file', testAudio, {
            filename: `ambient-music.${audio.format}`,
            contentType: audio.mimeType
          })
          .field('type', 'session_music')
          .field('entityId', campaign.id)
          .field('generateWaveform', 'true')
          .expect(200);

        expect(response.body.success).toBe(true);
        const audioData = response.body.data;

        // Check audio processing
        expect(audioData.processedVariants).toBeDefined();
        expect(audioData.processedVariants.webOptimized).toBeDefined();

        // Verify waveform data
        expect(audioData.waveform).toBeDefined();
        expect(audioData.waveform.peaks).toBeDefined();
        expect(Array.isArray(audioData.waveform.peaks)).toBe(true);
        expect(audioData.waveform.duration).toBeCloseTo(30, 1);
        expect(audioData.waveform.sampleRate).toBeDefined();

        // Check metadata
        expect(audioData.metadata.duration).toBeCloseTo(30, 1);
        expect(audioData.metadata.bitrate).toBeDefined();
        expect(audioData.metadata.channels).toBeDefined();
        expect(audioData.metadata.sampleRate).toBeDefined();
      }
    });

    it('Should handle large media files with chunked upload', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Simulate large file (100MB)
      const fileSize = 100 * 1024 * 1024;
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      const totalChunks = Math.ceil(fileSize / chunkSize);

      // Initialize chunked upload
      const initResponse = await request(app)
        .post('/api/media/upload/chunked/init')
        .send({
          filename: 'large-campaign-video.mp4',
          fileSize: fileSize,
          mimeType: 'video/mp4',
          chunkSize: chunkSize,
          totalChunks: totalChunks,
          metadata: {
            type: 'campaign_video',
            entityId: campaign.id
          }
        })
        .expect(200);

      const uploadId = initResponse.body.data.uploadId;
      expect(uploadId).toBeDefined();

      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const chunkData = Buffer.alloc(
          i === totalChunks - 1 ? fileSize % chunkSize : chunkSize
        );
        chunkData.fill(i); // Different content per chunk

        const chunkResponse = await request(app)
          .post('/api/media/upload/chunked/chunk')
          .attach('chunk', chunkData, {
            filename: `chunk-${i}`,
            contentType: 'application/octet-stream'
          })
          .field('uploadId', uploadId)
          .field('chunkIndex', i.toString())
          .field('chunkHash', createHash(chunkData))
          .expect(200);

        expect(chunkResponse.body.data.received).toBe(i + 1);
        expect(chunkResponse.body.data.progress).toBeCloseTo((i + 1) / totalChunks, 2);
      }

      // Complete chunked upload
      const completeResponse = await request(app)
        .post('/api/media/upload/chunked/complete')
        .send({
          uploadId: uploadId,
          expectedHash: 'mock-file-hash',
          processVideo: true
        })
        .expect(200);

      expect(completeResponse.body.success).toBe(true);
      expect(completeResponse.body.data.fileId).toBeDefined();
      expect(completeResponse.body.data.finalSize).toBe(fileSize);

      // Verify chunked upload was cleaned up
      const chunks = db.prepare('SELECT * FROM upload_chunks WHERE upload_id = ?').all(uploadId);
      expect(chunks).toHaveLength(0);
    });
  });

  describe('PDFとドキュメント処理', () => {
    it('Should extract text and generate previews from PDF documents', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Create test PDF
      const testPDF = await createTestPDF([
        'Campaign Setting: The Lost Kingdom',
        'Chapter 1: The Ancient Prophecy',
        'Long ago, in a realm forgotten by time...'
      ]);

      const response = await request(app)
        .post('/api/media/upload')
        .attach('file', testPDF, {
          filename: 'campaign-guide.pdf',
          contentType: 'application/pdf'
        })
        .field('type', 'campaign_document')
        .field('entityId', campaign.id)
        .field('extractText', 'true')
        .field('generatePreview', 'true')
        .expect(200);

      expect(response.body.success).toBe(true);
      const pdfData = response.body.data;

      // Check text extraction
      expect(pdfData.extractedText).toBeDefined();
      expect(pdfData.extractedText).toContain('Campaign Setting');
      expect(pdfData.extractedText).toContain('Ancient Prophecy');

      // Verify preview generation
      expect(pdfData.previews).toBeDefined();
      expect(pdfData.previews.length).toBeGreaterThan(0);
      expect(pdfData.previews[0].pageNumber).toBe(1);
      expect(pdfData.previews[0].thumbnail).toBeDefined();

      // Check metadata
      expect(pdfData.metadata.pageCount).toBeGreaterThan(0);
      expect(pdfData.metadata.hasText).toBe(true);
      expect(pdfData.metadata.isSearchable).toBe(true);

      // Test search functionality
      const searchResponse = await request(app)
        .get('/api/media/search')
        .query({
          q: 'Ancient Prophecy',
          type: 'document',
          campaignId: campaign.id
        })
        .expect(200);

      expect(searchResponse.body.data.results).toHaveLength(1);
      expect(searchResponse.body.data.results[0].fileId).toBe(pdfData.fileId);
      expect(searchResponse.body.data.results[0].matches).toBeDefined();
    });

    it('Should handle various document formats with proper conversion', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const documentFormats = [
        {
          format: 'docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          content: await createTestDocx('Campaign Notes: Session 1')
        },
        {
          format: 'md',
          mimeType: 'text/markdown',
          content: Buffer.from('# Campaign Notes\n## Session 1\n- Player actions\n- NPC interactions')
        },
        {
          format: 'txt',
          mimeType: 'text/plain',
          content: Buffer.from('Plain text campaign notes with important information')
        },
        {
          format: 'rtf',
          mimeType: 'application/rtf',
          content: createTestRTF('Rich text format notes')
        }
      ];

      for (const doc of documentFormats) {
        const response = await request(app)
          .post('/api/media/upload')
          .attach('file', doc.content, {
            filename: `notes.${doc.format}`,
            contentType: doc.mimeType
          })
          .field('type', 'session_notes')
          .field('entityId', campaign.id)
          .field('convertToPDF', 'true')
          .expect(200);

        expect(response.body.success).toBe(true);
        const docData = response.body.data;

        // Verify conversion
        expect(docData.convertedVariants).toBeDefined();
        if (doc.format !== 'pdf') {
          expect(docData.convertedVariants.pdf).toBeDefined();
        }

        // Check text extraction worked
        expect(docData.extractedText).toBeDefined();
        expect(docData.extractedText.length).toBeGreaterThan(0);

        // Markdown should preserve formatting
        if (doc.format === 'md') {
          expect(docData.metadata.hasFormatting).toBe(true);
          expect(docData.renderedHTML).toBeDefined();
        }
      }
    });
  });

  describe('メディアギャラリーと整理機能', () => {
    it('Should organize media into galleries with tagging and collections', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Upload various media files
      const mediaFiles = [];
      for (let i = 0; i < 20; i++) {
        const mediaType = ['image', 'video', 'audio', 'document'][i % 4];
        let response;

        if (mediaType === 'image') {
          response = await request(app)
            .post('/api/media/upload')
            .attach('file', await createTestImage('jpeg', 800, 600), {
              filename: `image-${i}.jpg`,
              contentType: 'image/jpeg'
            })
            .field('type', 'character_portrait')
            .field('entityId', campaign.id)
            .field('tags', JSON.stringify(['portrait', `character-${i % 5}`]))
            .expect(200);
        }

        if (response) {
          mediaFiles.push(response.body.data);
        }
      }

      // Create gallery/collection
      const galleryResponse = await request(app)
        .post('/api/media/galleries')
        .send({
          name: 'Character Portraits Collection',
          description: 'All character portraits for the campaign',
          campaignId: campaign.id,
          mediaIds: mediaFiles.slice(0, 10).map(m => m.fileId),
          tags: ['portraits', 'characters'],
          visibility: 'campaign_members'
        })
        .expect(201);

      expect(galleryResponse.body.success).toBe(true);
      const galleryId = galleryResponse.body.data.galleryId;

      // Test gallery operations
      // Add more media to gallery
      const addToGalleryResponse = await request(app)
        .post(`/api/media/galleries/${galleryId}/items`)
        .send({
          mediaIds: mediaFiles.slice(10, 15).map(m => m.fileId)
        })
        .expect(200);

      expect(addToGalleryResponse.body.data.addedCount).toBe(5);

      // Reorder gallery items
      const reorderResponse = await request(app)
        .put(`/api/media/galleries/${galleryId}/order`)
        .send({
          orderedMediaIds: mediaFiles.slice(0, 15).map(m => m.fileId).reverse()
        })
        .expect(200);

      expect(reorderResponse.body.success).toBe(true);

      // Search within gallery
      const gallerySearchResponse = await request(app)
        .get(`/api/media/galleries/${galleryId}/search`)
        .query({
          tags: 'character-1',
          mediaType: 'image'
        })
        .expect(200);

      expect(gallerySearchResponse.body.data.results.length).toBeGreaterThan(0);

      // Generate gallery preview/mosaic
      const mosaicResponse = await request(app)
        .post(`/api/media/galleries/${galleryId}/generate-preview`)
        .send({
          style: 'mosaic',
          columns: 4,
          maxItems: 12
        })
        .expect(200);

      expect(mosaicResponse.body.data.previewUrl).toBeDefined();
      expect(mosaicResponse.body.data.includedItems).toBe(12);
    });

    it('Should handle media relationships and dependencies', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      const character = TestDataFactory.createTestCharacter(campaign.id);
      await request(app).post('/api/characters').send(character).expect(201);

      // Upload character portrait
      const portraitResponse = await request(app)
        .post('/api/media/upload')
        .attach('file', await createTestImage('jpeg', 800, 1000), {
          filename: 'character-portrait.jpg',
          contentType: 'image/jpeg'
        })
        .field('type', 'character_portrait')
        .field('entityId', character.id)
        .field('entityType', 'character')
        .expect(200);

      const portraitId = portraitResponse.body.data.fileId;

      // Upload related media (character sheet PDF)
      const sheetResponse = await request(app)
        .post('/api/media/upload')
        .attach('file', await createTestPDF(['Character Sheet', 'Stats: STR 18, DEX 14']), {
          filename: 'character-sheet.pdf',
          contentType: 'application/pdf'
        })
        .field('type', 'character_sheet')
        .field('entityId', character.id)
        .field('relatedMediaIds', JSON.stringify([portraitId]))
        .expect(200);

      const sheetId = sheetResponse.body.data.fileId;

      // Create media relationship
      const relationshipResponse = await request(app)
        .post('/api/media/relationships')
        .send({
          sourceMediaId: portraitId,
          targetMediaId: sheetId,
          relationshipType: 'character_documentation',
          bidirectional: true
        })
        .expect(201);

      expect(relationshipResponse.body.success).toBe(true);

      // Test dependency check when trying to delete
      const deleteResponse = await request(app)
        .delete(`/api/media/${portraitId}`)
        .expect(409); // Conflict due to relationships

      expect(deleteResponse.body.error.code).toBe('MEDIA_HAS_DEPENDENCIES');
      expect(deleteResponse.body.error.details.dependencies).toContain(sheetId);

      // Get all related media
      const relatedMediaResponse = await request(app)
        .get(`/api/media/${portraitId}/related`)
        .expect(200);

      expect(relatedMediaResponse.body.data.relatedMedia).toHaveLength(1);
      expect(relatedMediaResponse.body.data.relatedMedia[0].fileId).toBe(sheetId);
      expect(relatedMediaResponse.body.data.relatedMedia[0].relationshipType).toBe('character_documentation');

      // Test cascade operations
      const cascadeDeleteResponse = await request(app)
        .delete(`/api/media/${portraitId}`)
        .query({ cascade: true })
        .expect(200);

      expect(cascadeDeleteResponse.body.data.deletedMedia).toContain(portraitId);
      expect(cascadeDeleteResponse.body.data.deletedMedia).toContain(sheetId);
    });
  });

  describe('メディアアクセス制御とCDN統合', () => {
    it('Should enforce access control based on campaign membership', async () => {
      // Create two campaigns with different users
      const campaign1 = TestDataFactory.createTestCampaign({ gmId: 'user-1' });
      const campaign2 = TestDataFactory.createTestCampaign({ gmId: 'user-2' });
      
      await request(app).post('/api/campaigns').send(campaign1).expect(201);
      await request(app).post('/api/campaigns').send(campaign2).expect(201);

      // Upload private media to campaign1
      const privateMediaResponse = await request(app)
        .post('/api/media/upload')
        .set('Authorization', 'Bearer user-1-token')
        .attach('file', await createTestImage('jpeg', 800, 600), {
          filename: 'private-map.jpg',
          contentType: 'image/jpeg'
        })
        .field('type', 'campaign_map')
        .field('entityId', campaign1.id)
        .field('visibility', 'campaign_members_only')
        .expect(200);

      const privateMediaId = privateMediaResponse.body.data.fileId;

      // User 2 (not in campaign1) tries to access
      const unauthorizedResponse = await request(app)
        .get(`/api/media/${privateMediaId}`)
        .set('Authorization', 'Bearer user-2-token')
        .expect(403);

      expect(unauthorizedResponse.body.error.code).toBe('ACCESS_DENIED');

      // Add user 2 to campaign1
      await request(app)
        .post(`/api/campaigns/${campaign1.id}/members`)
        .set('Authorization', 'Bearer user-1-token')
        .send({ userId: 'user-2', role: 'player' })
        .expect(201);

      // Now user 2 can access
      const authorizedResponse = await request(app)
        .get(`/api/media/${privateMediaId}`)
        .set('Authorization', 'Bearer user-2-token')
        .expect(200);

      expect(authorizedResponse.body.data.fileId).toBe(privateMediaId);

      // Test signed URL generation for CDN
      const signedUrlResponse = await request(app)
        .post(`/api/media/${privateMediaId}/signed-url`)
        .set('Authorization', 'Bearer user-2-token')
        .send({
          purpose: 'view',
          expiresIn: 3600 // 1 hour
        })
        .expect(200);

      expect(signedUrlResponse.body.data.signedUrl).toBeDefined();
      expect(signedUrlResponse.body.data.expiresAt).toBeDefined();
      expect(signedUrlResponse.body.data.cdnUrl).toBeDefined();
    });

    it('Should integrate with CDN for optimized delivery', async () => {
      const campaign = TestDataFactory.createTestCampaign();
      await request(app).post('/api/campaigns').send(campaign).expect(201);

      // Upload media with CDN optimization
      const mediaResponse = await request(app)
        .post('/api/media/upload')
        .attach('file', await createTestImage('jpeg', 4000, 3000), {
          filename: 'high-res-map.jpg',
          contentType: 'image/jpeg'
        })
        .field('type', 'campaign_map')
        .field('entityId', campaign.id)
        .field('enableCDN', 'true')
        .field('cdnRegions', JSON.stringify(['us-east', 'eu-west', 'asia-pacific']))
        .expect(200);

      const mediaData = mediaResponse.body.data;

      // Verify CDN URLs are generated
      expect(mediaData.cdnUrls).toBeDefined();
      expect(mediaData.cdnUrls.primary).toBeDefined();
      expect(mediaData.cdnUrls.fallback).toBeDefined();
      expect(mediaData.cdnUrls.regions).toBeDefined();

      // Test adaptive streaming for large media
      const adaptiveResponse = await request(app)
        .get(`/api/media/${mediaData.fileId}/adaptive`)
        .query({
          quality: 'auto',
          deviceType: 'mobile',
          connectionSpeed: '3g'
        })
        .expect(200);

      expect(adaptiveResponse.body.data.selectedVariant).toBe('mobile_optimized');
      expect(adaptiveResponse.body.data.bitrate).toBeLessThan(1000000); // Less than 1Mbps for 3G

      // Test CDN cache warming
      const cacheWarmResponse = await request(app)
        .post(`/api/media/${mediaData.fileId}/cdn/warm-cache`)
        .send({
          regions: ['us-west', 'eu-central'],
          variants: ['thumbnail', 'medium', 'large']
        })
        .expect(200);

      expect(cacheWarmResponse.body.data.warmedRegions).toHaveLength(2);
      expect(cacheWarmResponse.body.data.warmedVariants).toHaveLength(3);

      // Get CDN statistics
      const cdnStatsResponse = await request(app)
        .get(`/api/media/${mediaData.fileId}/cdn/stats`)
        .expect(200);

      expect(cdnStatsResponse.body.data.hitRate).toBeDefined();
      expect(cdnStatsResponse.body.data.bandwidthSaved).toBeDefined();
      expect(cdnStatsResponse.body.data.servedRequests).toBeDefined();
    });
  });
});

// Helper functions
function setupMediaTables(db: DatabaseType): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      type TEXT NOT NULL,
      variants TEXT,
      metadata TEXT,
      extracted_text TEXT,
      cdn_urls TEXT,
      visibility TEXT DEFAULT 'private',
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS media_security_logs (
      id TEXT PRIMARY KEY,
      media_id TEXT,
      event_type TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS upload_chunks (
      id TEXT PRIMARY KEY,
      upload_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      chunk_data BLOB NOT NULL,
      chunk_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS media_galleries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      campaign_id TEXT NOT NULL,
      visibility TEXT DEFAULT 'private',
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS media_relationships (
      id TEXT PRIMARY KEY,
      source_media_id TEXT NOT NULL,
      target_media_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
}

async function createTestImage(format: string, width: number, height: number): Promise<Buffer> {
  const image = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 100, g: 150, b: 200, alpha: 1 }
    }
  });

  // Add some visual elements
  const svg = `
    <svg width="${width}" height="${height}">
      <rect x="10" y="10" width="${width-20}" height="${height-20}" fill="white" opacity="0.5"/>
      <text x="${width/2}" y="${height/2}" text-anchor="middle" font-size="48" fill="black">
        Test Image ${width}x${height}
      </text>
    </svg>
  `;

  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toFormat(format as any)
    .toBuffer();
}

async function createTestGif(width: number, height: number): Promise<Buffer> {
  // Create animated GIF with multiple frames
  const frames = [];
  for (let i = 0; i < 5; i++) {
    const frame = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 100 + i * 20, g: 150, b: 200 - i * 20, alpha: 1 }
      }
    }).png().toBuffer();
    frames.push(frame);
  }

  // For testing, return first frame as static GIF
  return sharp(frames[0]).gif().toBuffer();
}

function createTestSVG(): Buffer {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <circle cx="200" cy="200" r="150" fill="blue" opacity="0.5"/>
      <text x="200" y="200" text-anchor="middle" font-size="24" fill="white">
        Vector Graphics Test
      </text>
    </svg>
  `;
  return Buffer.from(svg);
}

function createSVGWithScript(): Buffer {
  const maliciousSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <script>alert('XSS')</script>
      <circle cx="200" cy="200" r="150" fill="red"/>
    </svg>
  `;
  return Buffer.from(maliciousSVG);
}

async function createImageWithEXIF(): Promise<Buffer> {
  const image = await createTestImage('jpeg', 800, 600);
  
  // Add EXIF data with GPS coordinates
  return sharp(image)
    .withMetadata({
      exif: {
        IFD0: {
          Make: 'Test Camera',
          Model: 'TC-1000',
          Software: 'Test Software v1.0'
        },
        GPS: {
          GPSLatitude: [37, 46, 30],
          GPSLatitudeRef: 'N',
          GPSLongitude: [122, 25, 10],
          GPSLongitudeRef: 'W'
        }
      }
    })
    .jpeg()
    .toBuffer();
}

function createPolyglotFile(): Buffer {
  // Create a file that appears to be both JPEG and ZIP
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  const zipHeader = Buffer.from('PK\x03\x04');
  const maliciousContent = Buffer.from('malicious payload');
  
  return Buffer.concat([jpegHeader, Buffer.alloc(100), zipHeader, maliciousContent]);
}

async function createImageBomb(): Promise<Buffer> {
  // Create a small file that decompresses to huge size
  // For testing, just create a highly compressed image
  return sharp({
    create: {
      width: 10000,
      height: 10000,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .png({ compressionLevel: 9 })
  .toBuffer();
}

async function createTestVideo(format: string, duration: number): Promise<Buffer> {
  // For testing, create a simple video-like binary data
  const videoSize = duration * 1024 * 1024; // 1MB per second
  const videoData = Buffer.alloc(videoSize);
  
  // Add some headers to make it look like a video
  if (format === 'mp4') {
    // MP4 file signature
    videoData.write('ftyp', 4);
    videoData.write('mp42', 8);
  }
  
  return videoData;
}

async function createTestAudio(format: string, duration: number): Promise<Buffer> {
  // Create simple audio-like binary data
  const audioSize = duration * 128 * 1024; // 128KB per second
  const audioData = Buffer.alloc(audioSize);
  
  // Add format-specific headers
  if (format === 'mp3') {
    // MP3 header
    audioData[0] = 0xFF;
    audioData[1] = 0xFB;
  } else if (format === 'wav') {
    // WAV header
    audioData.write('RIFF', 0);
    audioData.write('WAVE', 8);
  }
  
  return audioData;
}

async function createTestPDF(pages: string[]): Promise<Buffer> {
  // Create simple PDF-like data
  let pdfContent = '%PDF-1.4\n';
  
  pages.forEach((page, index) => {
    pdfContent += `${index + 1} 0 obj\n<< /Type /Page /Content ${page} >>\nendobj\n`;
  });
  
  pdfContent += '%%EOF';
  
  return Buffer.from(pdfContent);
}

async function createTestDocx(content: string): Promise<Buffer> {
  // Create simple DOCX-like data (actually a ZIP with specific structure)
  const docxData = Buffer.from(`PK\x03\x04${content}`);
  return docxData;
}

function createTestRTF(content: string): Buffer {
  const rtf = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} ${content} }`;
  return Buffer.from(rtf);
}

function createHash(data: Buffer): string {
  // Simple hash for testing
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}