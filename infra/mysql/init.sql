CREATE DATABASE IF NOT EXISTS suzuhara_media
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE suzuhara_media;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('developer','viewer') NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS albums (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  visibility ENUM('private','unlisted','public') NOT NULL DEFAULT 'private',
  cover_media_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_albums_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS media (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id BIGINT UNSIGNED NOT NULL,
  album_id BIGINT UNSIGNED NULL,
  type ENUM('image','video') NOT NULL,
  filename VARCHAR(255) NOT NULL,
  title VARCHAR(255) NULL,
  mime_type VARCHAR(128) NOT NULL,
  bytes BIGINT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  duration_sec DECIMAL(7,2) NULL,
  sha256 CHAR(64) NOT NULL UNIQUE,
  taken_at DATETIME NULL,
  storage_path VARCHAR(512) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_media_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_album FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL,
  INDEX idx_media_type (type),
  INDEX idx_media_album (album_id),
  INDEX idx_media_taken_at (taken_at),
  INDEX idx_media_created_at (created_at)
) ENGINE=InnoDB;

ALTER TABLE albums
  ADD CONSTRAINT fk_albums_cover_media FOREIGN KEY (cover_media_id)
  REFERENCES media(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS tags (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS media_tags (
  media_id BIGINT UNSIGNED NOT NULL,
  tag_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (media_id, tag_id),
  CONSTRAINT fk_media_tags_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO users (username, email, password_hash, role)
VALUES ('developer', 'developer@example.com', '$2b$12$EOyw3C1Exhm9aeQcoK0lmehZldXtqPcKmDxiVhD7CKLrSDyb2lf6W', 'developer')
ON DUPLICATE KEY UPDATE username = VALUES(username);
