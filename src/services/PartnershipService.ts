import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Partnership, PartnerProfile, PartnershipDetails, PartnershipInvite, PartnershipStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Collections
const partnershipsCollection = collection(db, 'partnerships');
const partnershipInvitesCollection = collection(db, 'partnershipInvites');

// Default colors
export const DEFAULT_COLORS = {
  BLUE: '#1976d2',
  PURPLE: '#9c27b0',
  GREEN: '#4caf50',
  ORANGE: '#ff9800',
  RED: '#f44336',
  TEAL: '#009688'
};

// Create a new partnership
export const createPartnership = async (
  name: string,
  creatorId: string,
  creatorEmail: string,
  inviteeEmail: string
) => {
  // Generate a new partnership ID
  const partnershipId = uuidv4();
  
  // Create the partnership document
  const partnership: Partnership = {
    id: partnershipId,
    name,
    createdBy: creatorId,
    createdAt: Date.now(),
    status: 'pending'
  };
  
  // Set up the creator's profile
  const creatorProfile: PartnerProfile = {
    userId: creatorId,
    email: creatorEmail,
    nickname: 'You', // Creator sees themselves as "You"
    color: DEFAULT_COLORS.BLUE
  };
  
  // Set up the invitee's placeholder profile
  const inviteeProfile: PartnerProfile = {
    userId: '', // Will be filled when they accept
    email: inviteeEmail,
    nickname: 'Partner', // Default nickname
    color: DEFAULT_COLORS.PURPLE
  };
  
  // Create the full partnership details
  const partnershipDetails: PartnershipDetails = {
    ...partnership,
    partners: {
      [creatorId]: creatorProfile
    },
    invitedEmail: inviteeEmail
  };
  
  // Save the partnership to Firestore
  await setDoc(doc(partnershipsCollection, partnershipId), partnershipDetails);
  
  // Create an invite record
  const invite: PartnershipInvite = {
    partnershipId,
    partnershipName: name,
    inviterEmail: creatorEmail,
    inviteeEmail: inviteeEmail,
    status: 'pending',
    createdAt: Date.now()
  };
  
  await setDoc(doc(partnershipInvitesCollection, `${partnershipId}-${inviteeEmail.replace(/\./g, '_')}`), invite);
  
  return partnershipDetails;
};

// Get partnerships created by a user
export const getPartnershipsCreatedByUser = async (userId: string) => {
  const q = query(partnershipsCollection, where('createdBy', '==', userId));
  const querySnapshot = await getDocs(q);
  
  const partnerships: PartnershipDetails[] = [];
  querySnapshot.forEach((doc) => {
    partnerships.push(doc.data() as PartnershipDetails);
  });
  
  return partnerships;
};

// Get partnerships where the user is a partner
export const getUserPartnerships = async (userId: string) => {
  const q = query(partnershipsCollection, where(`partners.${userId}`, '!=', null));
  const querySnapshot = await getDocs(q);
  
  const partnerships: PartnershipDetails[] = [];
  querySnapshot.forEach((doc) => {
    partnerships.push(doc.data() as PartnershipDetails);
  });
  
  return partnerships;
};

// Get partnership invites for a user's email
export const getPartnershipInvitesByEmail = async (email: string) => {
  const q = query(partnershipInvitesCollection, where('inviteeEmail', '==', email), where('status', '==', 'pending'));
  const querySnapshot = await getDocs(q);
  
  const invites: PartnershipInvite[] = [];
  querySnapshot.forEach((doc) => {
    invites.push(doc.data() as PartnershipInvite);
  });
  
  return invites;
};

// Get a specific partnership by ID
export const getPartnership = async (partnershipId: string) => {
  const partnershipDoc = await getDoc(doc(partnershipsCollection, partnershipId));
  if (!partnershipDoc.exists()) return null;
  
  return partnershipDoc.data() as PartnershipDetails;
};

// Accept a partnership invite
export const acceptPartnership = async (partnershipId: string, userId: string, userEmail: string) => {
  // Get the partnership document
  const partnershipRef = doc(partnershipsCollection, partnershipId);
  const partnershipDoc = await getDoc(partnershipRef);
  if (!partnershipDoc.exists()) throw new Error('Partnership not found');
  
  const partnershipData = partnershipDoc.data() as PartnershipDetails;
  
  // Create a profile for the accepting user
  const acceptingUserProfile: PartnerProfile = {
    userId,
    email: userEmail,
    nickname: 'Partner',
    color: DEFAULT_COLORS.PURPLE
  };
  
  // Update the partnership with the accepting user's profile
  const updatedPartners = { ...partnershipData.partners };
  updatedPartners[userId] = acceptingUserProfile;
  
  // Update the partnership status to active
  await updateDoc(partnershipRef, {
    status: 'active',
    partners: updatedPartners
  });
  
  // Update the invite status
  const inviteRef = doc(partnershipInvitesCollection, `${partnershipId}-${userEmail.replace(/\./g, '_')}`);
  await updateDoc(inviteRef, { status: 'active' });
  
  return getPartnership(partnershipId);
};

// Decline a partnership invite
export const declinePartnership = async (partnershipId: string, userEmail: string) => {
  // Update the invite status
  const inviteRef = doc(partnershipInvitesCollection, `${partnershipId}-${userEmail.replace(/\./g, '_')}`);
  await updateDoc(inviteRef, { status: 'declined' });
  
  // Update the partnership status
  const partnershipRef = doc(partnershipsCollection, partnershipId);
  await updateDoc(partnershipRef, { status: 'declined' });
};

// Hide a declined partnership invite
export const hidePartnershipInvite = async (partnershipId: string, userEmail: string) => {
  // Delete the invite document
  const inviteRef = doc(partnershipInvitesCollection, `${partnershipId}-${userEmail.replace(/\./g, '_')}`);
  await setDoc(inviteRef, { hidden: true }, { merge: true });
};

// Delete a partnership
export const deletePartnership = async (partnershipId: string) => {
  const partnershipRef = doc(partnershipsCollection, partnershipId);
  await updateDoc(partnershipRef, { status: 'deleted' });
};

// Update partnership details
export const updatePartnership = async (partnershipId: string, updates: Partial<PartnershipDetails>) => {
  const partnershipRef = doc(partnershipsCollection, partnershipId);
  await updateDoc(partnershipRef, updates);
};

// Update partner profile
export const updatePartnerProfile = async (
  partnershipId: string,
  userId: string,
  updates: Partial<PartnerProfile>
) => {
  const partnershipRef = doc(partnershipsCollection, partnershipId);
  const partnershipDoc = await getDoc(partnershipRef);
  if (!partnershipDoc.exists()) throw new Error('Partnership not found');
  
  const partnershipData = partnershipDoc.data() as PartnershipDetails;
  const partnerProfile = partnershipData.partners[userId];
  
  if (!partnerProfile) throw new Error('Partner profile not found');
  
  const updatedProfile = { ...partnerProfile, ...updates };
  const updatedPartners = { ...partnershipData.partners };
  updatedPartners[userId] = updatedProfile;
  
  await updateDoc(partnershipRef, { partners: updatedPartners });
};