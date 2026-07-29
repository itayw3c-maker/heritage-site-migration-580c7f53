import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const LeadSchema = z.object({
  name: z.string().max(200).optional().default(''),
  phone: z.string().max(50).optional().default(''),
  email: z.string().max(200).nullable().optional().default(null),
  damage_type: z.string().max(200).nullable().optional().default(null),
  message: z.string().max(5000).nullable().optional().default(null),
  page_url: z.string().max(2000).optional().default(''),
  form_name: z.string().max(200).optional().default(''),
})

export const notifyLead = createServerFn({ method: 'POST' })
  .inputValidator((data) => LeadSchema.parse(data))
  .handler(async ({ data }) => {
    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
    const idKey =
      'lead-' +
      (data.phone || data.email || 'anon') +
      '-' +
      Math.floor(Date.now() / 1000)
    try {
      await sendTemplateEmail('lead-notification', 'office@rrshamaut.co.il', {
        templateData: {
          ...data,
          submitted_at: new Date().toLocaleString('he-IL', {
            timeZone: 'Asia/Jerusalem',
          }),
        },
        idempotencyKey: idKey,
        replyTo: data.email || undefined,
      })
      return { ok: true }
    } catch (err) {
      console.error('notifyLead failed', err)
      return { ok: false }
    }
  })