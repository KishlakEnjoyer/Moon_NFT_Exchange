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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'fe3e01db-cca7-11f0-b92b-18c04db6078c:1-1004';

--
-- Table structure for table `album_presents`
--

DROP TABLE IF EXISTS `album_presents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `album_presents` (
  `album_id` int NOT NULL,
  `present_id` int NOT NULL,
  KEY `fk_album_present_idx` (`album_id`),
  KEY `fk_present_album_idx` (`present_id`),
  CONSTRAINT `fk_album_present` FOREIGN KEY (`album_id`) REFERENCES `albums` (`album_id`),
  CONSTRAINT `fk_present_album` FOREIGN KEY (`present_id`) REFERENCES `presents` (`present_id`)
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
  `album_id` int NOT NULL AUTO_INCREMENT,
  `album_owner_id` bigint NOT NULL,
  `album_title` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`album_id`),
  KEY `fk_album_owner_idx` (`album_owner_id`),
  CONSTRAINT `fk_album_owner` FOREIGN KEY (`album_owner_id`) REFERENCES `users` (`user_tgid`)
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
-- Table structure for table `backgrounds`
--

DROP TABLE IF EXISTS `backgrounds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backgrounds` (
  `background_id` int NOT NULL AUTO_INCREMENT,
  `background_name` varchar(255) NOT NULL,
  `background_hex` varchar(7) NOT NULL,
  PRIMARY KEY (`background_id`)
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
-- Table structure for table `collection_models`
--

DROP TABLE IF EXISTS `collection_models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collection_models` (
  `collection_id` int NOT NULL,
  `model_id` int NOT NULL,
  KEY `fk_col_mod_idx` (`collection_id`),
  KEY `fk_mod_col_idx` (`model_id`),
  CONSTRAINT `fk_col_mod` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`collection_id`),
  CONSTRAINT `fk_mod_col` FOREIGN KEY (`model_id`) REFERENCES `models` (`model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collection_models`
--

LOCK TABLES `collection_models` WRITE;
/*!40000 ALTER TABLE `collection_models` DISABLE KEYS */;
/*!40000 ALTER TABLE `collection_models` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collections`
--

DROP TABLE IF EXISTS `collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collections` (
  `collection_id` int NOT NULL AUTO_INCREMENT,
  `collection_name` varchar(255) NOT NULL,
  `collection_image` mediumblob NOT NULL,
  `blockchain_network` varchar(50) DEFAULT 'ton',
  `contract_address` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`collection_id`)
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
-- Table structure for table `listings`
--

DROP TABLE IF EXISTS `listings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `listings` (
  `listing_id` int NOT NULL AUTO_INCREMENT,
  `present_id` int NOT NULL,
  `seller_id` bigint NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`listing_id`),
  UNIQUE KEY `uniq_present_active` (`present_id`,`is_active`),
  KEY `idx_price` (`price`),
  KEY `fk_listing_usr_idx` (`seller_id`),
  CONSTRAINT `fk_listing_present` FOREIGN KEY (`present_id`) REFERENCES `presents` (`present_id`),
  CONSTRAINT `fk_listing_usr` FOREIGN KEY (`seller_id`) REFERENCES `users` (`user_tgid`)
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
  `model_id` int NOT NULL AUTO_INCREMENT,
  `model_name` varchar(255) NOT NULL,
  `model_image` mediumblob NOT NULL,
  PRIMARY KEY (`model_id`)
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
  `present_id` int NOT NULL AUTO_INCREMENT,
  `creator_id` bigint NOT NULL,
  `owner_id` bigint NOT NULL,
  `collection_id` int NOT NULL,
  `model_id` int DEFAULT NULL,
  `background_id` int DEFAULT NULL,
  `present_num` int DEFAULT NULL,
  `generated_at` datetime DEFAULT NULL,
  `token_id` varchar(255) DEFAULT NULL,
  `blockchain_tx_hash` varchar(255) DEFAULT NULL,
  `present_image` mediumblob NOT NULL,
  `blockchain_status` enum('pending_mint','minted','transferred','synced') DEFAULT 'synced',
  `metadata_uri` varchar(512) DEFAULT NULL COMMENT 'IPFS или HTTPS ссылка на JSON',
  PRIMARY KEY (`present_id`),
  KEY `fk_collection_present_idx` (`collection_id`),
  KEY `fk_model_present_idx` (`model_id`),
  KEY `fk_bg_present_idx` (`background_id`),
  KEY `fk_present_creator_idx` (`creator_id`),
  KEY `fk_present_owner_idx` (`owner_id`),
  CONSTRAINT `fk_bg_present` FOREIGN KEY (`background_id`) REFERENCES `backgrounds` (`background_id`),
  CONSTRAINT `fk_collection_present` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`collection_id`),
  CONSTRAINT `fk_model_present` FOREIGN KEY (`model_id`) REFERENCES `models` (`model_id`),
  CONSTRAINT `fk_present_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`user_tgid`),
  CONSTRAINT `fk_present_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`user_tgid`)
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
-- Table structure for table `rates`
--

DROP TABLE IF EXISTS `rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rates` (
  `rate_id` int NOT NULL AUTO_INCREMENT,
  `rate_rating` int NOT NULL,
  `transaction_id` int NOT NULL,
  PRIMARY KEY (`rate_id`),
  KEY `fk_trans_rate_idx` (`transaction_id`),
  CONSTRAINT `fk_trans_rate` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`)
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
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `buyer_id` bigint NOT NULL,
  `seller_id` bigint NOT NULL,
  `present_id` int NOT NULL,
  `transaction_price` decimal(18,6) NOT NULL,
  `transaction_status` enum('Pending','Completed','Failed') DEFAULT NULL,
  `transaction_date` datetime DEFAULT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `fk_present_trans_idx` (`present_id`),
  KEY `fk_trans_seller_idx` (`seller_id`),
  KEY `fk_trans_buyer_idx` (`buyer_id`),
  CONSTRAINT `fk_present_trans` FOREIGN KEY (`present_id`) REFERENCES `presents` (`present_id`),
  CONSTRAINT `fk_trans_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`user_tgid`),
  CONSTRAINT `fk_trans_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`user_tgid`)
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
  `user_tgid` bigint NOT NULL,
  `user_username` varchar(255) DEFAULT NULL,
  `user_firstname` varchar(255) DEFAULT NULL,
  `user_lastname` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `user_pfps` mediumblob,
  PRIMARY KEY (`user_tgid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-30  1:24:43
