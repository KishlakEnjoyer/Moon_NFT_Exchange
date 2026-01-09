-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: moon_db
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'fe3e01db-cca7-11f0-b92b-18c04db6078c:1-1207';

--
-- Table structure for table `album_presents`
--

DROP TABLE IF EXISTS `album_presents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `album_presents` (
  `album_id` bigint unsigned NOT NULL,
  `present_id` bigint unsigned NOT NULL,
  `added_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`album_id`,`present_id`),
  KEY `idx_album_presents_album` (`album_id`),
  KEY `idx_album_presents_present` (`present_id`),
  CONSTRAINT `album_presents_ibfk_1` FOREIGN KEY (`album_id`) REFERENCES `albums` (`album_id`) ON DELETE CASCADE,
  CONSTRAINT `album_presents_ibfk_2` FOREIGN KEY (`present_id`) REFERENCES `presents` (`present_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `album_presents`
--

LOCK TABLES `album_presents` WRITE;
/*!40000 ALTER TABLE `album_presents` DISABLE KEYS */;
/*!40000 ALTER TABLE `album_presents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `albums`
--

DROP TABLE IF EXISTS `albums`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `albums` (
  `album_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `album_owner_id` bigint unsigned NOT NULL,
  `album_title` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`album_id`),
  KEY `idx_albums_owner` (`album_owner_id`),
  CONSTRAINT `albums_ibfk_1` FOREIGN KEY (`album_owner_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `albums`
--

LOCK TABLES `albums` WRITE;
/*!40000 ALTER TABLE `albums` DISABLE KEYS */;
/*!40000 ALTER TABLE `albums` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `log_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `details` json DEFAULT NULL,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`log_id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_time` (`created_at`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `backgrounds`
--

DROP TABLE IF EXISTS `backgrounds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backgrounds` (
  `background_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `background_name` varchar(255) NOT NULL,
  `background_hex` char(7) DEFAULT NULL,
  `background_image_url` text,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`background_id`),
  KEY `idx_backgrounds_hex` (`background_hex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backgrounds`
--

LOCK TABLES `backgrounds` WRITE;
/*!40000 ALTER TABLE `backgrounds` DISABLE KEYS */;
/*!40000 ALTER TABLE `backgrounds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blockchain_events`
--

DROP TABLE IF EXISTS `blockchain_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blockchain_events` (
  `event_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_type` varchar(50) NOT NULL,
  `blockchain_network` varchar(50) NOT NULL,
  `contract_address` varchar(255) NOT NULL,
  `tx_hash` varchar(255) NOT NULL,
  `block_number` bigint unsigned DEFAULT NULL,
  `event_data` json NOT NULL,
  `processed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`event_id`),
  KEY `idx_events_tx_hash` (`tx_hash`),
  KEY `idx_events_contract` (`contract_address`),
  KEY `idx_events_type` (`event_type`),
  KEY `idx_events_processed` (`processed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blockchain_events`
--

LOCK TABLES `blockchain_events` WRITE;
/*!40000 ALTER TABLE `blockchain_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `blockchain_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collections`
--

DROP TABLE IF EXISTS `collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collections` (
  `collection_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collection_name` varchar(255) NOT NULL,
  `collection_image_url` text,
  `collection_available_count` int NOT NULL,
  `collection_limit` int NOT NULL,
  `blockchain_network` varchar(50) NOT NULL,
  `contract_address` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`collection_id`),
  KEY `idx_collections_contract` (`contract_address`),
  KEY `idx_collections_network` (`blockchain_network`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collections`
--

LOCK TABLES `collections` WRITE;
/*!40000 ALTER TABLE `collections` DISABLE KEYS */;
/*!40000 ALTER TABLE `collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `current_owners`
--

DROP TABLE IF EXISTS `current_owners`;
/*!50001 DROP VIEW IF EXISTS `current_owners`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `current_owners` AS SELECT 
 1 AS `present_id`,
 1 AS `owner_id`,
 1 AS `owned_since`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `listings`
--

DROP TABLE IF EXISTS `listings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `listings` (
  `listing_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `present_id` bigint unsigned NOT NULL,
  `seller_id` bigint unsigned NOT NULL,
  `price` decimal(18,6) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ETH',
  `is_active` tinyint(1) DEFAULT '1',
  `expires_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`listing_id`),
  KEY `idx_listings_present` (`present_id`),
  KEY `idx_listings_seller` (`seller_id`),
  KEY `idx_listings_active` (`is_active`),
  KEY `idx_listings_expires` (`expires_at`),
  CONSTRAINT `listings_ibfk_1` FOREIGN KEY (`present_id`) REFERENCES `presents` (`present_id`) ON DELETE CASCADE,
  CONSTRAINT `listings_ibfk_2` FOREIGN KEY (`seller_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listings`
--

LOCK TABLES `listings` WRITE;
/*!40000 ALTER TABLE `listings` DISABLE KEYS */;
/*!40000 ALTER TABLE `listings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `models`
--

DROP TABLE IF EXISTS `models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `models` (
  `model_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collection_id` bigint unsigned NOT NULL,
  `model_name` varchar(255) NOT NULL,
  `model_description` text,
  `model_image_url` text,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`model_id`),
  UNIQUE KEY `uk_collection_model` (`collection_id`,`model_name`),
  KEY `idx_models_collection` (`collection_id`),
  KEY `idx_models_name` (`model_name`),
  CONSTRAINT `models_ibfk_1` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`collection_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `models`
--

LOCK TABLES `models` WRITE;
/*!40000 ALTER TABLE `models` DISABLE KEYS */;
/*!40000 ALTER TABLE `models` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `presents`
--

DROP TABLE IF EXISTS `presents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `presents` (
  `present_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collection_id` bigint unsigned NOT NULL,
  `model_id` bigint unsigned DEFAULT NULL,
  `background_id` bigint unsigned DEFAULT NULL,
  `symbol_id` bigint DEFAULT NULL,
  `present_num` int NOT NULL,
  `token_id` varchar(255) NOT NULL,
  `metadata_uri` text NOT NULL,
  `image_url` text,
  `generated_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `is_burned` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`present_id`),
  UNIQUE KEY `uk_collection_present` (`collection_id`,`present_num`),
  UNIQUE KEY `uk_token_collection` (`token_id`,`collection_id`),
  KEY `background_id` (`background_id`),
  KEY `idx_presents_collection` (`collection_id`),
  KEY `idx_presents_model` (`model_id`),
  KEY `idx_presents_token_id` (`token_id`),
  KEY `idx_presents_metadata` (`metadata_uri`(191)),
  KEY `idx_presents_burned` (`is_burned`),
  KEY `presents_ibfk_4_idx` (`symbol_id`),
  CONSTRAINT `presents_ibfk_1` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`collection_id`) ON DELETE CASCADE,
  CONSTRAINT `presents_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `models` (`model_id`) ON DELETE CASCADE,
  CONSTRAINT `presents_ibfk_3` FOREIGN KEY (`background_id`) REFERENCES `backgrounds` (`background_id`) ON DELETE SET NULL,
  CONSTRAINT `presents_ibfk_4` FOREIGN KEY (`symbol_id`) REFERENCES `symbols` (`symbol_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `presents`
--

LOCK TABLES `presents` WRITE;
/*!40000 ALTER TABLE `presents` DISABLE KEYS */;
/*!40000 ALTER TABLE `presents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `presents_with_state`
--

DROP TABLE IF EXISTS `presents_with_state`;
/*!50001 DROP VIEW IF EXISTS `presents_with_state`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `presents_with_state` AS SELECT 
 1 AS `present_id`,
 1 AS `collection_id`,
 1 AS `model_id`,
 1 AS `background_id`,
 1 AS `symbol_id`,
 1 AS `present_num`,
 1 AS `token_id`,
 1 AS `metadata_uri`,
 1 AS `image_url`,
 1 AS `generated_at`,
 1 AS `is_burned`,
 1 AS `is_upgraded`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `rates`
--

DROP TABLE IF EXISTS `rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rates` (
  `rate_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `rate_rating` int NOT NULL,
  `transaction_id` bigint unsigned NOT NULL,
  `reviewer_id` bigint unsigned NOT NULL,
  `comment` text,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`rate_id`),
  KEY `idx_rates_transaction` (`transaction_id`),
  KEY `idx_rates_reviewer` (`reviewer_id`),
  KEY `idx_rates_rating` (`rate_rating`),
  CONSTRAINT `rates_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`) ON DELETE CASCADE,
  CONSTRAINT `rates_ibfk_2` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `rates_chk_1` CHECK ((`rate_rating` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rates`
--

LOCK TABLES `rates` WRITE;
/*!40000 ALTER TABLE `rates` DISABLE KEYS */;
/*!40000 ALTER TABLE `rates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `symbols`
--

DROP TABLE IF EXISTS `symbols`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `symbols` (
  `symbol_id` bigint NOT NULL AUTO_INCREMENT,
  `symbol_name` varchar(255) NOT NULL,
  `symbol_image_url` text NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`symbol_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `symbols`
--

LOCK TABLES `symbols` WRITE;
/*!40000 ALTER TABLE `symbols` DISABLE KEYS */;
/*!40000 ALTER TABLE `symbols` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `transaction_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `buyer_id` bigint unsigned NOT NULL,
  `seller_id` bigint unsigned NOT NULL,
  `present_id` bigint unsigned NOT NULL,
  `transaction_price` decimal(18,6) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ETH',
  `transaction_status` varchar(20) NOT NULL,
  `blockchain_network` varchar(50) NOT NULL,
  `blockchain_tx_hash` varchar(255) NOT NULL,
  `block_number` bigint unsigned DEFAULT NULL,
  `transaction_date` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`transaction_id`),
  KEY `idx_transactions_buyer` (`buyer_id`),
  KEY `idx_transactions_seller` (`seller_id`),
  KEY `idx_transactions_present` (`present_id`),
  KEY `idx_transactions_hash` (`blockchain_tx_hash`),
  KEY `idx_transactions_status` (`transaction_status`),
  KEY `idx_transactions_network` (`blockchain_network`),
  KEY `idx_transactions_date` (`transaction_date`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`seller_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`present_id`) REFERENCES `presents` (`present_id`) ON DELETE CASCADE,
  CONSTRAINT `transactions_chk_1` CHECK ((`transaction_status` in (_utf8mb4'pending',_utf8mb4'confirmed',_utf8mb4'failed',_utf8mb4'cancelled')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_tg_id` bigint NOT NULL,
  `user_username` varchar(255) NOT NULL,
  `user_firstname` varchar(255) DEFAULT NULL,
  `user_lastname` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `last_seen` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `user_pfp_url` text,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user_tg_id` (`user_tg_id`),
  KEY `idx_users_tg_id` (`user_tg_id`),
  KEY `idx_users_username` (`user_username`),
  KEY `idx_users_email` (`email`),
  CONSTRAINT `chk_email` CHECK (((`email` is null) or regexp_like(`email`,_utf8mb4'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `current_owners`
--

/*!50001 DROP VIEW IF EXISTS `current_owners`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `current_owners` AS select `t`.`present_id` AS `present_id`,`t`.`buyer_id` AS `owner_id`,`t`.`transaction_date` AS `owned_since` from (`transactions` `t` join (select `transactions`.`present_id` AS `present_id`,max(`transactions`.`transaction_date`) AS `max_date` from `transactions` where (`transactions`.`transaction_status` = 'confirmed') group by `transactions`.`present_id`) `latest` on(((`t`.`present_id` = `latest`.`present_id`) and (`t`.`transaction_date` = `latest`.`max_date`)))) where (`t`.`transaction_status` = 'confirmed') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `presents_with_state`
--

/*!50001 DROP VIEW IF EXISTS `presents_with_state`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `presents_with_state` AS select `presents`.`present_id` AS `present_id`,`presents`.`collection_id` AS `collection_id`,`presents`.`model_id` AS `model_id`,`presents`.`background_id` AS `background_id`,`presents`.`symbol_id` AS `symbol_id`,`presents`.`present_num` AS `present_num`,`presents`.`token_id` AS `token_id`,`presents`.`metadata_uri` AS `metadata_uri`,`presents`.`image_url` AS `image_url`,`presents`.`generated_at` AS `generated_at`,`presents`.`is_burned` AS `is_burned`,(case when ((`presents`.`model_id` is not null) or (`presents`.`background_id` is not null) or (`presents`.`symbol_id` is not null)) then 1 else 0 end) AS `is_upgraded` from `presents` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-09 18:46:19
