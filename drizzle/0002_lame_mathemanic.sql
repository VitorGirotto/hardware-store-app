PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`document` text,
	`phone` text,
	`address` text,
	`credit_limit_in_cents` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_customers` (
	`id`,
	`name`,
	`document`,
	`phone`,
	`address`,
	`credit_limit_in_cents`,
	`is_active`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`name`,
	`document`,
	`phone`,
	`address`,
	0,
	true,
	`created_at`,
	`updated_at`
FROM `customers`;
--> statement-breakpoint
DROP TABLE `customers`;
--> statement-breakpoint
ALTER TABLE `__new_customers` RENAME TO `customers`;
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_document_unique` ON `customers` (`document`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
