from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.models.base import Base


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    country_code: Mapped[str] = mapped_column(String(3), unique=True, index=True, nullable=False)  # ISO 3166-1 alpha-3
    country_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False)  # Primary language for printing materials
    currency: Mapped[str] = mapped_column(String(3), nullable=True)  # ISO 4217 currency code (e.g., USD, EUR, INR)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    vendors: Mapped[list["Vendor"]] = relationship(back_populates="country", cascade="all, delete-orphan")
    pis: Mapped[list["PI"]] = relationship(back_populates="country", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Country(id={self.id}, code={self.country_code}, name={self.country_name}, language={self.language})>"
