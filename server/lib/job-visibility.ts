import type { Job } from '@shared/schema';

export function isJobLive(job: Pick<Job, 'isPublished' | 'isActive' | 'pipelineStatus' | 'jobStatus'>): boolean {
  return (
    !!job.isPublished &&
    !!job.isActive &&
    job.pipelineStatus === 'ready' &&
    job.jobStatus === 'open'
  );
}

export type NotLiveReason = 'NOT_PUBLISHED' | 'INACTIVE' | 'PIPELINE_NOT_READY' | 'JOB_NOT_OPEN';

export function getNotLiveReasons(job: Pick<Job, 'isPublished' | 'isActive' | 'pipelineStatus' | 'jobStatus'>): NotLiveReason[] {
  const reasons: NotLiveReason[] = [];
  if (!job.isPublished) reasons.push('NOT_PUBLISHED');
  if (!job.isActive) reasons.push('INACTIVE');
  if (job.pipelineStatus !== 'ready') reasons.push('PIPELINE_NOT_READY');
  if (job.jobStatus !== 'open') reasons.push('JOB_NOT_OPEN');
  return reasons;
}
