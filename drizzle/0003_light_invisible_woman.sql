CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`type` text NOT NULL,
	`quantity` real NOT NULL,
	`reason` text NOT NULL,
	`reference` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_movements_product_id_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_created_at_idx` ON `stock_movements` (`created_at`);--> statement-breakpoint
INSERT INTO `stock_movements` (`product_id`, `type`, `quantity`, `reason`, `reference`)
SELECT
	`id`,
	'entry',
	`stock_quantity`,
	'Estoque inicial migrado',
	'migration:0003'
FROM `products`
WHERE `stock_quantity` > 0;
