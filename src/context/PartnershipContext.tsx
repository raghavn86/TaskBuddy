import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createPartnership,
  getUserPartnerships,
  getPartnershipInvitesByEmail,
  getPartnership,
  acceptPartnership,
  declinePartnership,
  hidePartnershipInvite,
  updatePartnership,
  updatePartnerProfile,
  deletePartnership,
  DEFAULT_COLORS
} from '../services/PartnershipService';
import { useAuth } from './AuthContext';
import { PartnershipDetails, PartnershipInvite, PartnerProfile } from '../types';

type PartnershipContextType = {
  // State
  loading: boolean;
  partnershipInvites: PartnershipInvite[];
  userPartnerships: PartnershipDetails[];
  activePartnership: PartnershipDetails | null;
  
  // Actions
  createNewPartnership: (name: string, partnerEmail: string) => Promise<PartnershipDetails>;
  acceptPartnershipInvite: (partnershipId: string) => Promise<PartnershipDetails | null>;
  declinePartnershipInvite: (partnershipId: string) => Promise<void>;
  hidePartnershipInvite: (partnershipId: string) => Promise<void>;
  setActivePartnership: (partnership: PartnershipDetails | null) => void;
  updatePartnerProfile: (partnershipId: string, userId: string, updates: Partial<PartnerProfile>) => Promise<void>;
  getPartnershipById: (id: string) => Promise<PartnershipDetails | null>;
  getPartnerColor: (userId: string | null) => string;
  getPartnerNickname: (userId: string | null) => string;
  refreshPartnerships: () => Promise<void>;
  deletePartnership: (partnershipId: string) => Promise<void>;
};

const PartnershipContext = createContext<PartnershipContextType | null>(null);

export const usePartnership = () => {
  const context = useContext(PartnershipContext);
  if (!context) {
    throw new Error('usePartnership must be used within a PartnershipProvider');
  }
  return context;
};

type PartnershipProviderProps = {
  children: React.ReactNode;
};

type PartnershipState = {
  loading: boolean;
  partnershipInvites: PartnershipInvite[];
  userPartnerships: PartnershipDetails[];
  activePartnership: PartnershipDetails | null;
  restorationAttempted: boolean;
};

export const PartnershipProvider: React.FC<PartnershipProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [state, setState] = useState<PartnershipState>({
    loading: true,
    partnershipInvites: [],
    userPartnerships: [],
    activePartnership: null,
    restorationAttempted: false,
  });

  // Load partnerships and invites when the user logs in
  useEffect(() => {
    if (!currentUser) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }
    
    const loadPartnerships = async () => {
      try {
        setState(prev => ({ ...prev, loading: true }));
        await refreshPartnerships();
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    };
    
    loadPartnerships();
  }, [currentUser]);
  
  // Separate useEffect for restoring partnership from localStorage
  useEffect(() => {
    const restorePartnership = async () => {
      if (currentUser && !state.activePartnership && !state.restorationAttempted && !state.loading) {
        setState(prev => ({ ...prev, restorationAttempted: true }));
        
        const storedPartnershipId = localStorage.getItem('activePartnershipId');
        if (storedPartnershipId) {
          try {
            const partnership = await getPartnership(storedPartnershipId);
            if (partnership) {
              setState(prev => ({ ...prev, activePartnership: partnership }));
              console.log('🤝 Restored active partnership from localStorage:', partnership.name, {
                partnershipId: storedPartnershipId,
                timestamp: new Date().toISOString()
              });
            } else {
              localStorage.removeItem('activePartnershipId');
            }
          } catch (err) {
            console.error('Failed to load stored partnership:', err);
            localStorage.removeItem('activePartnershipId');
          }
        }
      }
    };
    
    restorePartnership();
  }, [currentUser, state.activePartnership, state.loading, state.restorationAttempted]);

  // Refresh partnerships and invites
  const refreshPartnerships = async () => {
    if (!currentUser) return;
    
    const [partnerships, invites] = await Promise.all([
      getUserPartnerships(currentUser.uid),
      getPartnershipInvitesByEmail(currentUser.email)
    ]);
    
    const activePartnerships = partnerships.filter(p => p.status !== 'deleted');
    const sortedPartnerships = activePartnerships.sort((a, b) => a.createdAt - b.createdAt);
    
    // Batch all updates into a single state change
    setState(prev => ({
      ...prev,
      userPartnerships: sortedPartnerships,
      partnershipInvites: invites,
    }));
    
    // Refresh active partnership if it exists
    if (state.activePartnership) {
      const refreshedPartnership = await getPartnership(state.activePartnership.id);
      setState(prev => ({
        ...prev,
        activePartnership: refreshedPartnership || null
      }));
    }
  };

  // Create a new partnership
  const createNewPartnership = async (name: string, partnerEmail: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const newPartnership = await createPartnership(
      name,
      currentUser.uid,
      currentUser.email,
      partnerEmail
    );
    
    await refreshPartnerships();
    return newPartnership;
  };

  // Accept a partnership invite
  const acceptPartnershipInvite = async (partnershipId: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const updatedPartnership = await acceptPartnership(
      partnershipId,
      currentUser.uid,
      currentUser.email
    );
    
    await refreshPartnerships();
    return updatedPartnership;
  };

  // Decline a partnership invite
  const declinePartnershipInvite = async (partnershipId: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    await declinePartnership(partnershipId, currentUser.email);
    await refreshPartnerships();
  };

  // Hide a partnership invite
  const hideInvite = async (partnershipId: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    await hidePartnershipInvite(partnershipId, currentUser.email);
    await refreshPartnerships();
  };

  // Get a partnership by ID
  const getPartnershipById = async (id: string) => {
    return await getPartnership(id);
  };

  // Update a partner's profile
  const updateProfile = async (
    partnershipId: string, 
    userId: string, 
    updates: Partial<PartnerProfile>
  ) => {
    await updatePartnerProfile(partnershipId, userId, updates);
    await refreshPartnerships();
  };

  // Get a partner's color
  const getPartnerColor = (userId: string | null) => {
    if (!userId || !state.activePartnership) return DEFAULT_COLORS.BLUE;
    
    const partner = state.activePartnership.partners[userId];
    return partner ? partner.color : DEFAULT_COLORS.BLUE;
  };

  // Get a partner's nickname
  const getPartnerNickname = (userId: string | null) => {
    if (!userId || !state.activePartnership) return 'Partner';
    
    if (currentUser && userId === currentUser.uid) return 'You';
    
    const partner = state.activePartnership.partners[userId];
    return partner ? partner.nickname : 'Partner';
  };

  // Wrap the setActivePartnership function to also update localStorage
  const handleSetActivePartnership = (partnership: PartnershipDetails | null) => {
    if (partnership?.id === state.activePartnership?.id) {
      return; // No change, don't trigger a re-render
    }
    
    setState(prev => ({ ...prev, activePartnership: partnership }));
    
    if (partnership) {
      localStorage.setItem('activePartnershipId', partnership.id);
    } else {
      localStorage.removeItem('activePartnershipId');
    }
  };

  // Delete a partnership
  const deletePartnershipById = async (partnershipId: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    if (state.activePartnership && state.activePartnership.id === partnershipId) {
      handleSetActivePartnership(null);
    }
    
    await deletePartnership(partnershipId);
    await refreshPartnerships();
  };

  const value: PartnershipContextType = {
    loading: state.loading,
    partnershipInvites: state.partnershipInvites,
    userPartnerships: state.userPartnerships,
    activePartnership: state.activePartnership,
    createNewPartnership,
    acceptPartnershipInvite,
    declinePartnershipInvite,
    hidePartnershipInvite: hideInvite,
    setActivePartnership: handleSetActivePartnership,
    updatePartnerProfile: updateProfile,
    getPartnershipById,
    getPartnerColor,
    getPartnerNickname,
    refreshPartnerships,
    deletePartnership: deletePartnershipById,
  };

  return <PartnershipContext.Provider value={value}>{children}</PartnershipContext.Provider>;
};