CREATE TABLE `backup_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`destination_directory` text,
	`reminder_days` integer DEFAULT 7 NOT NULL,
	`last_backup_at` text,
	`last_backup_path` text
);
