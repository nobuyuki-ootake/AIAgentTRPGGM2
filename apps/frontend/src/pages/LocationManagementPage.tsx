import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { currentCampaignAtom } from '@/store/atoms';
import LocationManager from '@/components/locations/LocationManager';

const LocationManagementPage: React.FC = () => {
  const { id: campaignId } = useParams<{ id: string }>();
  const currentCampaign = useRecoilValue(currentCampaignAtom);

  // キャンペーンIDがない場合はホームにリダイレクト
  if (!campaignId) {
    return <Navigate to="/" replace />;
  }

  // キャンペーンが読み込まれていない場合はキャンペーンページにリダイレクト
  if (!currentCampaign || currentCampaign.id !== campaignId) {
    return <Navigate to={`/campaign/${campaignId}/setup`} replace />;
  }

  return <LocationManager campaignId={campaignId} />;
};

export default LocationManagementPage;