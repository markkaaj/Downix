import { pgTable, text, timestamp, boolean, bigint, integer, serial } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  chatId: bigint('chat_id', { mode: 'number' }).primaryKey(),
  lang: text('lang').default('en').notNull(),
  username: text('username'),
});

export const subscriptions = pgTable('subscriptions', {
  chatId: bigint('chat_id', { mode: 'number' }).primaryKey(),
  isLifetime: boolean('is_lifetime').default(false).notNull(),
  expiry: bigint('expiry', { mode: 'number' }),
});

export const referrals = pgTable('referrals', {
  chatId: bigint('chat_id', { mode: 'number' }).primaryKey(),
  count: integer('count').default(0).notNull(),
  days: integer('days').default(0).notNull(),
});

export const usage = pgTable('usage', {
  id: serial('id').primaryKey(),
  chatId: bigint('chat_id', { mode: 'number' }).notNull(),
  date: text('date').notNull(),
  count: integer('count').default(0).notNull(),
});

export const supportMap = pgTable('support_map', {
  adminMessageId: integer('admin_message_id').primaryKey(),
  originalChatId: bigint('original_chat_id', { mode: 'number' }).notNull(),
});

export const supportState = pgTable('support_state', {
  chatId: bigint('chat_id', { mode: 'number' }).primaryKey(),
  isWaiting: boolean('is_waiting').default(false).notNull(),
});

export const history = pgTable('history', {
  id: serial('id').primaryKey(),
  chatId: bigint('chat_id', { mode: 'number' }).notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  platform: text('platform').notNull(),
  date: bigint('date', { mode: 'number' }).notNull(),
});

export const giftCodes = pgTable('gift_codes', {
  id: text('id').primaryKey(),
  durationDays: integer('duration_days').notNull(),
  maxUsages: integer('max_usages').notNull(),
  usedCount: integer('used_count').default(0).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const usedGiftCodes = pgTable('used_gift_codes', {
  id: serial('id').primaryKey(),
  codeId: text('code_id').notNull(),
  chatId: bigint('chat_id', { mode: 'number' }).notNull(),
});
