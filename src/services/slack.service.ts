import axios from 'axios';
import { RawJob, ScraperResult } from '../types';
import { SLACK, PLATFORMS, FILTER } from '../constants';
import { config } from '../config/env';

export class SlackService {
  async sendJobAlert(job: RawJob): Promise<void> {
    const emoji = this.getJobEmoji(job);
    const badges: string[] = [];
    if (job.easyApply) badges.push('⚡ Easy Apply');
    if (job.ycBatch) badges.push(`🚀 YC ${job.ycBatch}`);

    const salaryLine = job.salary && job.salary !== FILTER.SALARY_NOT_MENTIONED
      ? `💰 *${job.salary}*`
      : '💰 Salary not disclosed';

    const tagsLine = job.tags
      ? job.tags.split(',').slice(0, 5).map((t) => `\`${t.trim()}\``).join('  ')
      : '';

    const payload = {
      attachments: [
        {
          color: '#5865f2',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${emoji} *${job.title}*\n*${job.company}*   ·   📍 ${job.location || 'India'}`,
              },
              accessory: {
                type: 'button',
                text: { type: 'plain_text', text: SLACK.MESSAGES.APPLY_BUTTON_TEXT, emoji: true },
                url: job.url,
                style: 'primary',
              },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: salaryLine },
                { type: 'mrkdwn', text: `🏷️ *Source:* ${job.source.toUpperCase()}` },
                ...(job.postedAt ? [{ type: 'mrkdwn', text: `🕐 *Posted:* ${job.postedAt}` }] : []),
                ...(badges.length ? [{ type: 'mrkdwn', text: badges.join('   ') }] : []),
              ],
            },
            ...(tagsLine
              ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: `🔧 ${tagsLine}` }] }]
              : []),
          ],
        },
      ],
    };

    await this.sendWithRetry(payload);
  }

  async sendSummary(results: ScraperResult[], newJobCount: number): Promise<void> {
    const counts: Record<string, number> = {};
    for (const result of results) {
      counts[result.platform] = result.jobs.length;
    }

    const payload = {
      attachments: [
        {
          color: '#1a1a2e',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: newJobCount > 0
                  ? `📊  *Job Hunt Update* — Found *${newJobCount} new jobs* today`
                  : `✅  *Job Hunt Update* — No new jobs found today`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: [
                    `🔵 LinkedIn: *${counts[PLATFORMS.LINKEDIN] ?? 0}*`,
                    `🟠 Wellfound: *${counts[PLATFORMS.WELLFOUND] ?? 0}*`,
                    `🔴 YC: *${counts[PLATFORMS.YC] ?? 0}*`,
                    `🟣 Cutshort: *${counts[PLATFORMS.CUTSHORT] ?? 0}*`,
                    `🟢 Instahyre: *${counts[PLATFORMS.INSTAHYRE] ?? 0}*`,
                  ].join('   ·   '),
                },
              ],
            },
          ],
        },
      ],
    };

    await this.sendWithRetry(payload);
  }

  private getJobEmoji(job: RawJob): string {
    if (job.ycBatch) return SLACK.EMOJIS.YC_JOB;
    if (job.easyApply) return SLACK.EMOJIS.EASY_APPLY;
    return SLACK.EMOJIS.NEW_JOB;
  }

  private async sendWithRetry(payload: object): Promise<void> {
    try {
      await this.send(payload);
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] [SLACK] Retry after ${SLACK.RETRY_DELAY_MS}ms`);
      await this.delay(SLACK.RETRY_DELAY_MS);
      await this.send(payload);
    }
  }

  private async send(payload: object): Promise<void> {
    const body = { channel: config.slack.channelId, ...payload };
    const res = await axios.post(SLACK.API_URL, body, {
      timeout: SLACK.REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.slack.botToken}`,
      },
    });
    // Slack API always returns 200 — actual errors are in res.data.ok
    if (!res.data.ok) {
      throw new Error(`Slack API error: ${res.data.error}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
