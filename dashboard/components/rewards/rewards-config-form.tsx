'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRewardsConfig } from '@/hooks/use-rewards-config';
import { useGuildData } from '@/hooks/use-guild-data';
import type { CreateReward } from '@/lib/services/rewards.service';
import { Card, CardContent } from '@/components/ui/card';

import type { RewardFormState, Reward } from './types';
import { DEFAULT_FORM_STATE } from './types';
import { buildRewardData, isFormValid, groupRewardsByLevel } from './utils';
import { PageHeader } from './page-header';
import { StatusAlerts } from './status-alerts';
import { Sidebar } from './sidebar';
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

  const isFormOpen = showAddForm || editingReward !== null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader onAddClick={() => setShowAddForm(true)} />

      {/* Status Messages */}
      <StatusAlerts error={error} success={success} />

      {/* Form Overlay (when adding/editing) */}
      {isFormOpen && (
        <div className="animate-in slide-in-from-top-2 duration-300">
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
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Left Column - Rewards List */}
        <div className="min-w-0">
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

        {/* Right Column - Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Sidebar
            stats={stats}
            levelsWithRewards={levelsWithRewards}
            templates={templates}
            hasExistingRewards={rewards.length > 0}
            roles={roles}
            saving={saving}
            onApplyTemplate={handleApplyTemplate}
            getUserRewards={getUserRewards}
          />
        </div>
      </div>
    </div>
  );
}

export default RewardsConfigForm;
