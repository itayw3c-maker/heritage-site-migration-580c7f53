import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface LeadNotificationProps {
  name?: string
  phone?: string
  email?: string | null
  damage_type?: string | null
  message?: string | null
  page_url?: string
  form_name?: string
  submitted_at?: string
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <Text style={{ margin: '4px 0', fontSize: '15px', lineHeight: '1.6' }}>
      <strong>{label}:</strong> {value}
    </Text>
  )
}

export function LeadNotificationEmail({
  name = '',
  phone = '',
  email = null,
  damage_type = null,
  message = null,
  page_url = '',
  form_name = '',
  submitted_at = '',
}: LeadNotificationProps) {
  return (
    <Html lang="he" dir="rtl">
      <Head />
      <Preview>ליד חדש מהאתר: {name || phone}</Preview>
      <Body
        style={{
          backgroundColor: '#f5f5f5',
          fontFamily:
            'Heebo, "Noto Sans Hebrew", -apple-system, Segoe UI, Arial, sans-serif',
          direction: 'rtl',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            padding: '28px',
            maxWidth: '600px',
            margin: '20px auto',
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
          }}
        >
          <Heading style={{ color: '#056FC4', margin: '0 0 8px' }}>
            ליד חדש מהאתר
          </Heading>
          <Text style={{ color: '#666', margin: '0 0 16px' }}>
            שמאי רכוש רפאל ריבוח
          </Text>
          <Hr style={{ borderColor: '#CBA436' }} />
          <Section style={{ marginTop: '16px' }}>
            <Row label="שם" value={name} />
            <Row label="טלפון" value={phone} />
            <Row label="אימייל" value={email} />
            <Row label="סוג נזק" value={damage_type} />
            <Row label="הודעה" value={message} />
          </Section>
          <Hr style={{ borderColor: '#eee', marginTop: '20px' }} />
          <Section>
            <Row label="עמוד" value={page_url} />
            <Row label="שם טופס" value={form_name} />
            <Row label="נשלח בתאריך" value={submitted_at} />
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: LeadNotificationEmail,
  displayName: 'הודעת ליד חדש',
  to: 'office@rrshamaut.co.il',
  subject: (data) => {
    const who = (data?.name || data?.phone || '').toString().trim()
    return who ? `ליד חדש מהאתר — ${who}` : 'ליד חדש מהאתר'
  },
  previewData: {
    name: 'ישראל ישראלי',
    phone: '050-1234567',
    email: 'test@example.com',
    damage_type: 'נזקי מים',
    message: 'נזילה מהשכן מלמעלה, נגרם נזק לתקרה ולקירות.',
    page_url: 'https://www.rrshamaut.co.il/',
    form_name: 'contact-form',
    submitted_at: new Date().toISOString(),
  },
} satisfies TemplateEntry