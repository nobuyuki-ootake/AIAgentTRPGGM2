import { useState, useEffect, useCallback, useMemo } from 'react';
import { Location, LocationQuery, ID, PaginatedResponse, Character } from '@ai-agent-trpg/types';
import * as locationApi from '../api/locations';
import { useSnackbar } from 'notistack';

export function useLocations(initialQuery?: LocationQuery) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedResponse<Location>, 'items'>>({
    totalCount: 0,
    pageSize: 20,
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const memoizedInitialQuery = useMemo(() => initialQuery, [JSON.stringify(initialQuery)]);

  const fetchLocations = useCallback(async (query?: LocationQuery) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await locationApi.getLocations(query);
      setLocations(result.items);
      setPagination({
        totalCount: result.totalCount,
        pageSize: result.pageSize,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch locations';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const createLocation = useCallback(async (data: locationApi.CreateLocationData) => {
    try {
      const newLocation = await locationApi.createLocation(data);
      setLocations(prev => [...prev, newLocation]);
      enqueueSnackbar('場所を作成しました', { variant: 'success' });
      return newLocation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create location';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw err;
    }
  }, [enqueueSnackbar]);

  const updateLocation = useCallback(async (id: ID, updates: Partial<Location>) => {
    try {
      const updatedLocation = await locationApi.updateLocation(id, updates);
      setLocations(prev => 
        prev.map(location => 
          location.id === id ? updatedLocation : location,
        ),
      );
      enqueueSnackbar('場所を更新しました', { variant: 'success' });
      return updatedLocation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update location';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw err;
    }
  }, [enqueueSnackbar]);

  const deleteLocation = useCallback(async (id: ID) => {
    try {
      await locationApi.deleteLocation(id);
      setLocations(prev => prev.filter(location => location.id !== id));
      enqueueSnackbar('場所を削除しました', { variant: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete location';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw err;
    }
  }, [enqueueSnackbar]);

  const seedDefaultLocations = useCallback(async () => {
    try {
      const newLocations = await locationApi.seedDefaultLocations();
      setLocations(prev => [...prev, ...newLocations]);
      enqueueSnackbar(`${newLocations.length}個のデフォルト場所を作成しました`, { variant: 'success' });
      return newLocations;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to seed default locations';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw err;
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchLocations(memoizedInitialQuery);
  }, [fetchLocations, memoizedInitialQuery]);

  return {
    locations,
    pagination,
    loading,
    error,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    seedDefaultLocations,
  };
}

export function useLocation(locationId: ID | null) {
  const [location, setLocation] = useState<Location | null>(null);
  const [charactersInLocation, setCharactersInLocation] = useState<Character[]>([]);
  const [connectedLocations, setConnectedLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const fetchLocation = useCallback(async (id: ID) => {
    setLoading(true);
    setError(null);
    
    try {
      const [locationData, charactersData, connectionsData] = await Promise.all([
        locationApi.getLocationById(id),
        locationApi.getCharactersInLocation(id),
        locationApi.getConnectedLocations(id),
      ]);
      
      setLocation(locationData);
      setCharactersInLocation(charactersData);
      setConnectedLocations(connectionsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch location details';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const moveCharacter = useCallback(async (data: locationApi.MoveCharacterData) => {
    try {
      const movement = await locationApi.moveCharacter(data);
      
      // Update characters in current location if this location is the destination
      if (locationId === data.toLocationId) {
        await fetchLocation(locationId);
      }
      
      enqueueSnackbar('キャラクターを移動しました', { variant: 'success' });
      return movement;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move character';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw err;
    }
  }, [locationId, fetchLocation, enqueueSnackbar]);

  useEffect(() => {
    if (locationId) {
      fetchLocation(locationId);
    } else {
      setLocation(null);
      setCharactersInLocation([]);
      setConnectedLocations([]);
    }
  }, [locationId, fetchLocation]);

  return {
    location,
    charactersInLocation,
    connectedLocations,
    loading,
    error,
    fetchLocation,
    moveCharacter,
  };
}