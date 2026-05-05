export type RewardSource = 'level' | 'manual' | 'carry_forward';

export interface RewardDefinition {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  amount?: number;
  amountUnit?: string;
}

export interface RewardLevel {
  id: string;
  name: string;
  stepCount: number;
  rewards: RewardDefinition[];
}

export interface RewardKid {
  id: string;
  name: string;
}

export interface RewardTemplate {
  id: string;
  partnershipId: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  weekBoundaryDay: number;
  defaultStartLevel: number;
  currentWeekOrder: number;
  kids: RewardKid[];
  levels: RewardLevel[];
  standbyRewards: RewardDefinition[];
}

export interface RewardNote {
  id: string;
  type: 'good' | 'bad';
  text: string;
  createdAt: number;
}

export interface RewardInstance {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  remainingQuantity: number;
  amount?: number;
  remainingAmount?: number;
  amountUnit?: string;
  source: RewardSource;
  isCarryForward?: boolean;
}

export interface RewardWeekKidRecord {
  id: string;
  partnershipId: string;
  templateId: string;
  weekOrder: number;
  kidId: string;
  kidName: string;
  createdAt: number;
  updatedAt: number;
  openedAt?: number;
  frozenAt?: number;
  levels: RewardLevel[];
  currentLevel: number;
  currentStep: number;
  manualRewards: RewardInstance[];
  earnedRewards: RewardInstance[];
  notes: RewardNote[];
}

export interface RewardWeekGroup {
  weekOrder: number;
  kids: RewardWeekKidRecord[];
}
