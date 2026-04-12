"""
Config flow for Plant Diary Advanced integration.
Permet l'ajout via l'UI Home Assistant.
"""

from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from .const import DOMAIN


class PlantDiaryAdvancedConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Plant Diary Advanced."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            # Un seul entry autorisé (single instance)
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title="Plant Diary Advanced", data={})

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({}),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return PlantDiaryAdvancedOptionsFlowHandler(config_entry)


class PlantDiaryAdvancedOptionsFlowHandler(config_entries.OptionsFlow):
    def __init__(self, config_entry):
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        # Pas d'options pour l'instant
        return self.async_create_entry(title="", data={})
