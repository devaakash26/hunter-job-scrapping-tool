import axios from 'axios';
import { RawJob, ScraperResult } from '../types';
import { SLACK, PLATFORMS } from '../constants';
import { config } from '../config/env';

export class SlackService {
  async sendJobAlert(job: RawJob): Promise<void> {
    const emoji = this.getJobEmoji(job);
    const header = `${emoji} ${SLACK.MESSAGES.JOB_HEADER_PREFIX} — ${job.title} at ${job.company}`;

    const payload = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: header.substring(0, 150), emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Company:*\n${job.company}` },
            { type: 'mrkdwn', text: `*Location:*\n${job.location || 'Not specified'}` },
            { type: 'mrkdwn', text: `*Salary:*\n${job.salary}` },
            { type: 'mrkdwn', text: `*Source:*\n${job.source.toUpperCase()}` },
            { type: 'mrkdwn', text: `*Tags:*\n${job.tags || 'N/A'}` },
            { type: 'mrkdwn', text: `*Posted:*\n${job.postedAt || 'Unknown'}` },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: SLACK.MESSAGES.APPLY_BUTTON_TEXT, emoji: true },
              url: job.url,
              style: 'primary',
            },
          ],
        },
        { type: 'divider' },
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

  async sendErrorAlert(platform: string, errorMessage: string): Promise<void> {
    const payload = {
      text: `${SLACK.EMOJIS.ERROR} *Scraper Error* [${platform.toUpperCase()}]: ${errorMessage}`,
    };
    await this.sendWithRetry(payload).catch(() => {
      // Best-effort — don't cascade failures
    });
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
