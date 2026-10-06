// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const learningRecords=sqliteTable('learning_records',{
 userId:text('user_id').notNull(),
 itemId:text('item_id').notNull(),
 completed:integer('completed',{mode:'boolean'}).notNull().default(false),
 note:text('note').notNull().default(''),
 updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.userId,t.itemId]})]);
