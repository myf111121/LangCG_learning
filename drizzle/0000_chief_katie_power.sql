CREATE TABLE `learning_records` (
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `item_id`)
);
