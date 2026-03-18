CREATE DATABASE  IF NOT EXISTS `moon_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `moon_db`;
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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '5e413194-bca1-11f0-8c8e-6a5c699f88d4:1-166,
fe3e01db-cca7-11f0-b92b-18c04db6078c:1-1519,
ff3cbf88-c26b-11f0-97f6-9247a0409e9e:1-339';

--
-- Temporary view structure for view `active_listings_view`
--

DROP TABLE IF EXISTS `active_listings_view`;
/*!50001 DROP VIEW IF EXISTS `active_listings_view`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `active_listings_view` AS SELECT 
 1 AS `listing_id`,
 1 AS `price`,
 1 AS `listed_at`,
 1 AS `present_id`,
 1 AS `token_id`,
 1 AS `present_image_url`,
 1 AS `metadata_uri`,
 1 AS `collection_id`,
 1 AS `collection_name`,
 1 AS `model_name`,
 1 AS `background_name`,
 1 AS `background_hex`,
 1 AS `symbol_name`,
 1 AS `seller_id`,
 1 AS `seller_username`,
 1 AS `seller_wallet`*/;
SET character_set_client = @saved_cs_client;

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
  KEY `idx_album` (`album_id`),
  KEY `idx_present` (`present_id`),
  CONSTRAINT `fk_ap_album` FOREIGN KEY (`album_id`) REFERENCES `albums` (`album_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ap_present` FOREIGN KEY (`present_id`) REFERENCES `presents` (`present_id`) ON DELETE CASCADE
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
  `updated_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`album_id`),
  KEY `idx_owner` (`album_owner_id`),
  CONSTRAINT `fk_albums_owner` FOREIGN KEY (`album_owner_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
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
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_time` (`created_at`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
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
  KEY `idx_hex` (`background_hex`)
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
-- Table structure for table `blockchain_event_types`
--

DROP TABLE IF EXISTS `blockchain_event_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blockchain_event_types` (
  `event_type_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `event_type_name` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`event_type_id`),
  UNIQUE KEY `uq_event_type_name` (`event_type_name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blockchain_event_types`
--

LOCK TABLES `blockchain_event_types` WRITE;
/*!40000 ALTER TABLE `blockchain_event_types` DISABLE KEYS */;
INSERT INTO `blockchain_event_types` VALUES (1,'mint','Создание нового токена'),(2,'transfer','Передача токена между кошельками'),(3,'list','Выставление подарка на продажу'),(4,'buy','Покупка подарка'),(5,'delist','Снятие подарка с продажи'),(6,'upgrade','Улучшение подарка'),(7,'burn','Сжигание токена при обратном выкупе');
/*!40000 ALTER TABLE `blockchain_event_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blockchain_events`
--

DROP TABLE IF EXISTS `blockchain_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blockchain_events` (
  `event_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_type_id` tinyint unsigned NOT NULL,
  `blockchain_network` varchar(50) NOT NULL,
  `contract_address` varchar(255) NOT NULL,
  `tx_hash` varchar(255) NOT NULL,
  `block_number` bigint unsigned DEFAULT NULL,
  `event_data` json NOT NULL,
  `processed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`event_id`),
  UNIQUE KEY `uq_tx_hash` (`tx_hash`),
  KEY `idx_type` (`event_type_id`),
  KEY `idx_contract` (`contract_address`),
  KEY `idx_processed` (`processed_at`),
  CONSTRAINT `fk_be_event_type` FOREIGN KEY (`event_type_id`) REFERENCES `blockchain_event_types` (`event_type_id`)
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
  `description` text,
  `collection_limit` int NOT NULL,
  `collection_available_count` int NOT NULL,
  `purchase_limit` int DEFAULT NULL,
  `blockchain_network` varchar(50) NOT NULL DEFAULT 'localhost',
  `contract_address` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `base_price` decimal(18,6) NOT NULL DEFAULT '100.000000',
  PRIMARY KEY (`collection_id`),
  KEY `idx_active` (`is_active`),
  KEY `idx_contract` (`contract_address`)
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
-- Table structure for table `listing_statuses`
--

DROP TABLE IF EXISTS `listing_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `listing_statuses` (
  `status_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `status_name` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`status_id`),
  UNIQUE KEY `uq_status_name` (`status_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listing_statuses`
--

LOCK TABLES `listing_statuses` WRITE;
/*!40000 ALTER TABLE `listing_statuses` DISABLE KEYS */;
INSERT INTO `listing_statuses` VALUES (1,'active','Лот активен, доступен для покупки'),(2,'sold','Подарок продан'),(3,'cancelled','Лот снят продавцом');
/*!40000 ALTER TABLE `listing_statuses` ENABLE KEYS */;
UNLOCK TABLES;

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
  `status_id` tinyint unsigned NOT NULL DEFAULT '1',
  `price` decimal(18,6) NOT NULL,
  `blockchain_tx_hash` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`listing_id`),
  KEY `idx_present` (`present_id`),
  KEY `idx_seller` (`seller_id`),
  KEY `idx_status` (`status_id`),
  KEY `idx_price` (`price`),
  CONSTRAINT `fk_listings_present` FOREIGN KEY (`present_id`) REFERENCES `presents` (`present_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_listings_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_listings_status` FOREIGN KEY (`status_id`) REFERENCES `listing_statuses` (`status_id`)
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
  UNIQUE KEY `uq_collection_model` (`collection_id`,`model_name`),
  KEY `idx_collection` (`collection_id`),
  CONSTRAINT `fk_models_collection` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`collection_id`) ON DELETE CASCADE
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
  `symbol_id` bigint unsigned DEFAULT NULL,
  `present_num` int NOT NULL,
  `token_id` varchar(255) NOT NULL,
  `metadata_uri` text NOT NULL,
  `image_url` text,
  `generated_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `is_burned` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`present_id`),
  UNIQUE KEY `uq_collection_num` (`collection_id`,`present_num`),
  UNIQUE KEY `uq_token_collection` (`token_id`,`collection_id`),
  KEY `idx_collection` (`collection_id`),
  KEY `idx_model` (`model_id`),
  KEY `idx_background` (`background_id`),
  KEY `idx_symbol` (`symbol_id`),
  KEY `idx_burned` (`is_burned`),
  CONSTRAINT `fk_presents_background` FOREIGN KEY (`background_id`) REFERENCES `backgrounds` (`background_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_presents_collection` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`collection_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_presents_model` FOREIGN KEY (`model_id`) REFERENCES `models` (`model_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_presents_symbol` FOREIGN KEY (`symbol_id`) REFERENCES `symbols` (`symbol_id`) ON DELETE SET NULL
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
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'user','Обычный пользователь, регистрируется через Telegram'),(2,'manager','Модератор платформы'),(3,'admin','Полный доступ к системе');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `symbols`
--

DROP TABLE IF EXISTS `symbols`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `symbols` (
  `symbol_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `symbol_name` varchar(255) NOT NULL,
  `symbol_image_url` text NOT NULL,
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
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
-- Temporary view structure for view `transaction_history`
--

DROP TABLE IF EXISTS `transaction_history`;
/*!50001 DROP VIEW IF EXISTS `transaction_history`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `transaction_history` AS SELECT 
 1 AS `transaction_id`,
 1 AS `blockchain_tx_hash`,
 1 AS `transaction_price`,
 1 AS `platform_fee`,
 1 AS `seller_received`,
 1 AS `transaction_date`,
 1 AS `transaction_type`,
 1 AS `transaction_status`,
 1 AS `present_id`,
 1 AS `token_id`,
 1 AS `collection_name`,
 1 AS `seller_id`,
 1 AS `seller_username`,
 1 AS `buyer_id`,
 1 AS `buyer_username`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `transaction_statuses`
--

DROP TABLE IF EXISTS `transaction_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_statuses` (
  `status_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `status_name` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`status_id`),
  UNIQUE KEY `uq_status_name` (`status_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_statuses`
--

LOCK TABLES `transaction_statuses` WRITE;
/*!40000 ALTER TABLE `transaction_statuses` DISABLE KEYS */;
INSERT INTO `transaction_statuses` VALUES (1,'pending','Ожидает подтверждения'),(2,'confirmed','Подтверждена'),(3,'failed','Отклонена'),(4,'cancelled','Отменена');
/*!40000 ALTER TABLE `transaction_statuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_types`
--

DROP TABLE IF EXISTS `transaction_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_types` (
  `type_id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `type_name` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`type_id`),
  UNIQUE KEY `uq_type_name` (`type_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_types`
--

LOCK TABLES `transaction_types` WRITE;
/*!40000 ALTER TABLE `transaction_types` DISABLE KEYS */;
INSERT INTO `transaction_types` VALUES (1,'purchase','Покупка неулучшенного подарка из коллекции'),(2,'upgrade','Оплата улучшения подарка'),(3,'marketplace','Покупка улучшенного подарка у другого пользователя'),(4,'burn','Обратный выкуп подарка платформой');
/*!40000 ALTER TABLE `transaction_types` ENABLE KEYS */;
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
  `type_id` tinyint unsigned NOT NULL,
  `status_id` tinyint unsigned NOT NULL DEFAULT '1',
  `transaction_price` decimal(18,6) NOT NULL,
  `platform_fee` decimal(18,6) NOT NULL DEFAULT '0.000000',
  `seller_received` decimal(18,6) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'TON',
  `blockchain_network` varchar(50) NOT NULL DEFAULT 'localhost',
  `blockchain_tx_hash` varchar(255) NOT NULL,
  `block_number` bigint unsigned DEFAULT NULL,
  `transaction_date` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`transaction_id`),
  UNIQUE KEY `uq_tx_hash` (`blockchain_tx_hash`),
  KEY `idx_buyer` (`buyer_id`),
  KEY `idx_seller` (`seller_id`),
  KEY `idx_present` (`present_id`),
  KEY `idx_type` (`type_id`),
  KEY `idx_status` (`status_id`),
  KEY `idx_date` (`transaction_date`),
  CONSTRAINT `fk_tx_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tx_present` FOREIGN KEY (`present_id`) REFERENCES `presents` (`present_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tx_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tx_status` FOREIGN KEY (`status_id`) REFERENCES `transaction_statuses` (`status_id`),
  CONSTRAINT `fk_tx_type` FOREIGN KEY (`type_id`) REFERENCES `transaction_types` (`type_id`)
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
-- Table structure for table `user_collection_purchases`
--

DROP TABLE IF EXISTS `user_collection_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_collection_purchases` (
  `user_id` bigint unsigned NOT NULL,
  `collection_id` bigint unsigned NOT NULL,
  `purchase_count` int NOT NULL DEFAULT '0',
  `updated_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_id`,`collection_id`),
  KEY `idx_collection` (`collection_id`),
  CONSTRAINT `fk_ucp_collection` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`collection_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ucp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_collection_purchases`
--

LOCK TABLES `user_collection_purchases` WRITE;
/*!40000 ALTER TABLE `user_collection_purchases` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_collection_purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_id` tinyint unsigned NOT NULL DEFAULT '1',
  `user_tg_id` bigint DEFAULT NULL,
  `username` varchar(255) NOT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `profile_pic_url` text,
  `wallet_address` varchar(42) DEFAULT NULL,
  `wallet_private_key` varchar(66) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  `last_seen` datetime(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_tg_id` (`user_tg_id`),
  UNIQUE KEY `uq_wallet` (`wallet_address`),
  KEY `idx_role` (`role_id`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  CONSTRAINT `chk_email` CHECK (((`email` is null) or regexp_like(`email`,_utf8mb4'^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$')))
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
-- Final view structure for view `active_listings_view`
--

/*!50001 DROP VIEW IF EXISTS `active_listings_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `active_listings_view` AS select `l`.`listing_id` AS `listing_id`,`l`.`price` AS `price`,`l`.`created_at` AS `listed_at`,`p`.`present_id` AS `present_id`,`p`.`token_id` AS `token_id`,`p`.`image_url` AS `present_image_url`,`p`.`metadata_uri` AS `metadata_uri`,`c`.`collection_id` AS `collection_id`,`c`.`collection_name` AS `collection_name`,`m`.`model_name` AS `model_name`,`b`.`background_name` AS `background_name`,`b`.`background_hex` AS `background_hex`,`s`.`symbol_name` AS `symbol_name`,`u`.`user_id` AS `seller_id`,`u`.`username` AS `seller_username`,`u`.`wallet_address` AS `seller_wallet` from (((((((`listings` `l` join `listing_statuses` `ls` on(((`ls`.`status_id` = `l`.`status_id`) and (`ls`.`status_name` = 'active')))) join `presents` `p` on((`p`.`present_id` = `l`.`present_id`))) join `collections` `c` on((`c`.`collection_id` = `p`.`collection_id`))) join `users` `u` on((`u`.`user_id` = `l`.`seller_id`))) left join `models` `m` on((`m`.`model_id` = `p`.`model_id`))) left join `backgrounds` `b` on((`b`.`background_id` = `p`.`background_id`))) left join `symbols` `s` on((`s`.`symbol_id` = `p`.`symbol_id`))) where (`p`.`is_burned` = 0) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

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
/*!50001 VIEW `current_owners` AS select `t`.`present_id` AS `present_id`,`t`.`buyer_id` AS `owner_id`,`t`.`transaction_date` AS `owned_since` from ((`transactions` `t` join (select `t2`.`present_id` AS `present_id`,max(`t2`.`transaction_date`) AS `max_date` from (`transactions` `t2` join `transaction_statuses` `ts` on(((`ts`.`status_id` = `t2`.`status_id`) and (`ts`.`status_name` = 'confirmed')))) group by `t2`.`present_id`) `latest` on(((`t`.`present_id` = `latest`.`present_id`) and (`t`.`transaction_date` = `latest`.`max_date`)))) join `transaction_statuses` `ts` on(((`ts`.`status_id` = `t`.`status_id`) and (`ts`.`status_name` = 'confirmed')))) */;
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
/*!50001 VIEW `presents_with_state` AS select `p`.`present_id` AS `present_id`,`p`.`collection_id` AS `collection_id`,`p`.`model_id` AS `model_id`,`p`.`background_id` AS `background_id`,`p`.`symbol_id` AS `symbol_id`,`p`.`present_num` AS `present_num`,`p`.`token_id` AS `token_id`,`p`.`metadata_uri` AS `metadata_uri`,`p`.`image_url` AS `image_url`,`p`.`generated_at` AS `generated_at`,`p`.`is_burned` AS `is_burned`,(case when ((`p`.`model_id` is not null) and (`p`.`background_id` is not null) and (`p`.`symbol_id` is not null)) then 1 else 0 end) AS `is_upgraded` from `presents` `p` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `transaction_history`
--

/*!50001 DROP VIEW IF EXISTS `transaction_history`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `transaction_history` AS select `t`.`transaction_id` AS `transaction_id`,`t`.`blockchain_tx_hash` AS `blockchain_tx_hash`,`t`.`transaction_price` AS `transaction_price`,`t`.`platform_fee` AS `platform_fee`,`t`.`seller_received` AS `seller_received`,`t`.`transaction_date` AS `transaction_date`,`tt`.`type_name` AS `transaction_type`,`ts`.`status_name` AS `transaction_status`,`p`.`present_id` AS `present_id`,`p`.`token_id` AS `token_id`,`c`.`collection_name` AS `collection_name`,`seller`.`user_id` AS `seller_id`,`seller`.`username` AS `seller_username`,`buyer`.`user_id` AS `buyer_id`,`buyer`.`username` AS `buyer_username` from ((((((`transactions` `t` join `transaction_types` `tt` on((`tt`.`type_id` = `t`.`type_id`))) join `transaction_statuses` `ts` on((`ts`.`status_id` = `t`.`status_id`))) join `presents` `p` on((`p`.`present_id` = `t`.`present_id`))) join `collections` `c` on((`c`.`collection_id` = `p`.`collection_id`))) join `users` `seller` on((`seller`.`user_id` = `t`.`seller_id`))) join `users` `buyer` on((`buyer`.`user_id` = `t`.`buyer_id`))) */;
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

-- Dump completed on 2026-03-19  1:54:19
