"""Persistent storage for Plant Diary."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION

_LOGGER = logging.getLogger(__name__)


class PlantStorage:
    """Manages persistence of plant data."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._data: dict[str, dict[str, Any]] = {}

    async def async_load(self) -> None:
        """Load plants from storage."""
        stored = await self._store.async_load()
        if stored and "plants" in stored:
            self._data = stored["plants"]
            _LOGGER.debug("Loaded %d plants from storage", len(self._data))
        else:
            self._data = {}

    async def async_save(self) -> None:
        """Persist plants to storage."""
        await self._store.async_save({"plants": self._data})

    def get_all(self) -> dict[str, dict[str, Any]]:
        return dict(self._data)

    def get(self, plant_id: str) -> dict[str, Any] | None:
        return self._data.get(plant_id)

    async def async_create(self, plant_id: str, data: dict[str, Any]) -> None:
        self._data[plant_id] = data
        await self.async_save()

    async def async_update(self, plant_id: str, data: dict[str, Any]) -> bool:
        if plant_id not in self._data:
            return False
        self._data[plant_id].update(data)
        await self.async_save()
        return True

    async def async_delete(self, plant_id: str) -> bool:
        if plant_id not in self._data:
            return False
        del self._data[plant_id]
        await self.async_save()
        return True
