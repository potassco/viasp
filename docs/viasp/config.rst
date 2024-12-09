==========================
Configuration of Constants
==========================

The configuration of constants used for sizing and animating the viASP graph is defined in the file `/backend/src/viasp/server/config.json`.

.. code-block:: JSON

    {
        // animation constants (in milliseconds)
        // smaller values make the graph more responsive,
        // but will cause performance loss
        "DEBOUNCETIMEOUT": 150, 
        "SMALLERDEBOUNCETIMEOUT": 50,
        "rowAnimationIntervalInMs": 30,
        "rowAnimationPickupThreshold": 0.01, // arbitrary units
        "awaitingInputSpinnerSpeed": 0.3,

        // graph color change constants
        "hoverColorDarkenFactor": 0.08,
        "hoverColorLightenFactor": 0.15,
        "opacityMultiplier": 0.8,
        "ruleHighlightDuration": 3000,
        "ruleHighlightFadeDuration": 1000,
        "searchResultHighlightDuration": 4500,

        // graph sizing constants (in em)
        "minimumNodeHeight": 2.5,
        "standardNodeHeight": 6.5,
        "minSearchInputWidthInEm": 15,
        "maxSearchInputWidthInEm": 40,
        "zoomBtnTranlsaltionDiff": 1,

        // graph resizing / zooming constants
        "overflowThreshold": 0.1,
        "zoomBtnDiff": 0.1,

        // keys
        "zoomToggleBtn": 16,
        "zoomInBtns": "+*",
        "zoomOutBtns": "-_",
        "KEY_DOWN": 40,
        "KEY_UP": 38,
        "KEY_LEFT": 37,
        "KEY_RIGHT": 39,
        "KEY_ENTER": 13
    }
