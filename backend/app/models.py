from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    String,
    Enum,
    ForeignKey,
    DateTime,
    func,
    BigInteger,
    Integer,
    UniqueConstraint,
    Index,
    Text,
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(Enum("developer", "viewer", name="user_role_enum"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    albums: Mapped[list["Album"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    media: Mapped[list["Media"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Album(Base):
    __tablename__ = "albums"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255))
    visibility: Mapped[str] = mapped_column(
        Enum("private", "unlisted", "public", name="album_visibility_enum"), default="private"
    )
    cover_media_id: Mapped[Optional[int]] = mapped_column(ForeignKey("media.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped[User] = relationship(back_populates="albums")
    cover_media: Mapped[Optional["Media"]] = relationship(
        foreign_keys=lambda: [Album.cover_media_id],
        post_update=True,
    )
    media_items: Mapped[list["Media"]] = relationship(
        "Media",
        back_populates="album",
        foreign_keys=lambda: [Media.album_id],
        primaryjoin=lambda: Album.id == foreign(Media.album_id),
    )


class Media(Base):
    __tablename__ = "media"
    __table_args__ = (
        UniqueConstraint("sha256", name="uq_media_sha256"),
        Index("idx_media_type", "type"),
        Index("idx_media_album", "album_id"),
        Index("idx_media_taken_at", "taken_at"),
        Index("idx_media_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    album_id: Mapped[Optional[int]] = mapped_column(ForeignKey("albums.id"), nullable=True, index=True)
    type: Mapped[str] = mapped_column(Enum("image", "video", name="media_type_enum"))
    filename: Mapped[str] = mapped_column(String(255))
    title: Mapped[Optional[str]] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(128))
    bytes: Mapped[int] = mapped_column("bytes", BigInteger, nullable=False)
    width: Mapped[Optional[int]] = mapped_column(Integer)
    height: Mapped[Optional[int]] = mapped_column(Integer)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    taken_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    storage_path: Mapped[str] = mapped_column(String(512))
    preview_path: Mapped[Optional[str]] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped[User] = relationship(back_populates="media")
    album: Mapped[Optional[Album]] = relationship(
        "Album",
        back_populates="media_items",
        foreign_keys=lambda: [Media.album_id],
        primaryjoin=lambda: Album.id == foreign(Media.album_id),
    )
    tags: Mapped[list["Tag"]] = relationship(
        secondary="media_tags",
        back_populates="media",
        cascade="all",
    )


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    media: Mapped[list[Media]] = relationship(secondary="media_tags", back_populates="tags")


class MediaTag(Base):
    __tablename__ = "media_tags"
    __table_args__ = (
        UniqueConstraint("media_id", "tag_id", name="uq_media_tags_media_tag"),
    )

    media_id: Mapped[int] = mapped_column(ForeignKey("media.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), primary_key=True)


class SocialPost(Base):
    __tablename__ = "social_posts"
    __table_args__ = (
        UniqueConstraint("platform", "external_id", name="uq_social_platform_external"),
        Index("idx_social_platform_created", "platform", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(Enum("x", "instagram", name="social_platform_enum"), index=True)
    external_id: Mapped[str] = mapped_column(String(128))
    author_name: Mapped[str] = mapped_column(String(128))
    author_handle: Mapped[str] = mapped_column(String(128))
    author_avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
    content: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    repost_count: Mapped[int] = mapped_column(Integer, default=0)
    reply_count: Mapped[int] = mapped_column(Integer, default=0)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    permalink: Mapped[Optional[str]] = mapped_column(String(512))

    media_items: Mapped[list["SocialMedia"]] = relationship(back_populates="post", cascade="all, delete-orphan")
    replies: Mapped[list["SocialReply"]] = relationship(back_populates="post", cascade="all, delete-orphan")


class SocialMedia(Base):
    __tablename__ = "social_media"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("social_posts.id", ondelete="CASCADE"))
    media_type: Mapped[str] = mapped_column(Enum("image", "video", name="social_media_type_enum"))
    url: Mapped[str] = mapped_column(String(512))
    preview_url: Mapped[Optional[str]] = mapped_column(String(512))
    alt_text: Mapped[Optional[str]] = mapped_column(String(255))
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    post: Mapped[SocialPost] = relationship(back_populates="media_items")


class SocialReply(Base):
    __tablename__ = "social_replies"
    __table_args__ = (
        Index("idx_social_reply_post_created", "post_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("social_posts.id", ondelete="CASCADE"))
    external_id: Mapped[Optional[str]] = mapped_column(String(128))
    author_name: Mapped[str] = mapped_column(String(128))
    author_handle: Mapped[str] = mapped_column(String(128))
    author_avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
    content: Mapped[str] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    permalink: Mapped[Optional[str]] = mapped_column(String(512))

    post: Mapped[SocialPost] = relationship(back_populates="replies")
