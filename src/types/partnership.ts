import { User } from '.';

export type PartnershipStatus = 'pending' | 'active' | 'declined' | 'deleted';

export type Partnership = {
  id: string;
  name: string;
  createdBy: string; // userId of creator
  createdAt: number;
  status: PartnershipStatus;
};

export type PartnerProfile = {
  userId: string;
  email: string;
  nickname: string;
  color: string;
};

export type PartnershipDetails = Partnership & {
  partners: Record<string, PartnerProfile>; // userId -> PartnerProfile
  invitedEmail?: string;
};

export type PartnershipInvite = {
  partnershipId: string;
  partnershipName: string;
  inviterEmail: string;
  inviteeEmail: string;
  status: PartnershipStatus;
  createdAt: number;
};