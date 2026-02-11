'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRewardsConfig } from '@/hooks/use-rewards-config';
import { useGuildData } from '@/hooks/use-guild-data';
import type { CreateReward } from '@/lib/services/rewards.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import type { RewardFormState, Reward } from './types';
import { DEFAULT_FORM_STATE } from './types';
import { buildRewardData, isFormValid, groupRewardsByLevel } from './utils';
import { RewardStats } from './reward-stats';
import { UserClaimsLookup } from './user-claims-lookup';
import { RewardTemplates } from './reward-templates';
import { RewardForm } from './reward-form';
import { RewardsList } from './rewards-list';

interface RewardsConfigFormProps {
  guildId: string;
}

export function RewardsConfigForm({ guildId }: RewardsConfigFormProps) {
  const router = useRouter();
  const {
    rewards,
    stats,
    templates,
    loading,
    saving,
    error,
    createReward,
    updateReward,
    deleteReward,
    applyTemplate,
    getUserRewards,
  } = useRewardsConfig(guildId);
  const { roles, textChannels, loading: loadingRoles } = useGuildData(guildId);

  const [success, setSuccess] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [newReward, setNewReward] = useState<RewardFormState>(DEFAULT_FORM_STATE);
  const [editForm, setEditForm] = useState<RewardFormState>(DEFAULT_FORM_STATE);

  const showSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleCreateReward = async () => {
    if (!isFormValid(newReward)) return;

    const reward: CreateReward = {
      level: newReward.level,
      xpType: newReward.xpType,
      rewardType: newReward.rewardType,
      rewardData: buildRewardData(newReward),
      name: newReward.name,
      description: newReward.description || undefined,
      stackable: newReward.stackable,
      oneTime: newReward.oneTime,
    };

    const result = await createReward(reward);
    if (result.success) {
      showSuccess();
      setShowAddForm(false);
      setNewReward(DEFAULT_FORM_STATE);
      router.refresh();
    }
  };

  const handleStartEdit = (reward: Reward) => {
    setEditingReward(reward);
    setEditForm({
      level: reward.level,
      xpType: reward.xpType,
      rewardType: reward.rewardType,
      roleId: reward.rewardData.roleId || '',
      removeRoleIds: (reward.rewardData.removeRoles as string[]) || [],
      channelIds: reward.rewardData.channelIds || [],
      permissions: reward.rewardData.permissions || [],
      message: (reward.rewardData.message as string) || '',
      name: reward.name,
      description: reward.description || '',
      stackable: reward.stackable,
      oneTime: reward.oneTime,
    });
  };

  const handleCancelEdit = () => {
    setEditingReward(null);
    setEditForm(DEFAULT_FORM_STATE);
  };

  const handleSaveEdit = async () => {
    if (!editingReward || !isFormValid(editForm)) return;

    const result = await updateReward(editingReward.id, {
      level: editForm.level,
      xpType: editForm.xpType,
      rewardType: editForm.rewardType,
      rewardData: buildRewardData(editForm),
      name: editForm.name,
      description: editForm.description || undefined,
      stackable: editForm.stackable,
      oneTime: editForm.oneTime,
    });

    if (result.success) {
      showSuccess();
      setEditingReward(null);
      setEditForm(DEFAULT_FORM_STATE);
    }
  };

  const handleToggleEnabled = async (rewardId: string, enabled: boolean) => {
    const result = await updateReward(rewardId, { enabled });
    if (result.success) {
      showSuccess();
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    const result = await deleteReward(rewardId);
    if (result.success) {
      showSuccess();
      router.refresh();
    }
  };

  const handleApplyTemplate = async (templateName: string) => {
    const result = await applyTemplate(templateName);
    if (result.success) {
      showSuccess();
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted/50 rounded w-1/3 mb-2" />
          <div className="h-4 bg-muted/30 rounded w-1/2" />
        </div>
        <Card variant="glass">
          <CardContent className="py-12">
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-muted-foreground">Loading rewards configuration...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rewardsByLevel = groupRewardsByLevel(rewards);
  const levelsWithRewards = Object.keys(rewardsByLevel).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Level Rewards</h2>
          <p className="text-muted-foreground mt-1">Configure rewards for reaching XP levels</p>
        </div>
        <Button variant="neon" onClick={() => setShowAddForm(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Reward
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="glass border-destructive/50 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-destructive">Error</h3>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="glass border-success/50 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-success flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-success">Success</h3>
            <p className="text-sm text-success/80 mt-1">Changes saved successfully!</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && <RewardStats stats={stats} levelsWithRewards={levelsWithRewards} />}

      {/* User Claims Lookup */}
      <UserClaimsLookup roles={roles} getUserRewards={getUserRewards} />

      {/* Templates */}
      <RewardTemplates
        templates={templates}
        hasExistingRewards={rewards.length > 0}
        saving={saving}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* Add Reward Form */}
      {showAddForm && (
        <RewardForm
          form={newReward}
          onChange={setNewReward}
          onSubmit={handleCreateReward}
          onCancel={() => setShowAddForm(false)}
          roles={roles}
          textChannels={textChannels}
          loadingRoles={loadingRoles}
          saving={saving}
          isValid={isFormValid(newReward)}
          mode="create"
        />
      )}

      {/* Edit Reward Form */}
      {editingReward && (
        <RewardForm
          form={editForm}
          onChange={setEditForm}
          onSubmit={handleSaveEdit}
          onCancel={handleCancelEdit}
          roles={roles}
          textChannels={textChannels}
          loadingRoles={loadingRoles}
          saving={saving}
          isValid={isFormValid(editForm)}
          mode="edit"
        />
      )}

      {/* Rewards List */}
      <RewardsList
        rewards={rewards}
        roles={roles}
        saving={saving}
        onToggleEnabled={handleToggleEnabled}
        onEdit={handleStartEdit}
        onDelete={handleDeleteReward}
        onAddClick={() => setShowAddForm(true)}
      />
    </div>
  );
}

export default RewardsConfigForm;
