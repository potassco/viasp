=============
Configuration
=============

Graph Interaction
-----------------

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


String output and Localization
------------------------------

The string output for the command line interface is defined by the JSON object in the file ``/backend/src/viasp/locales/en.json``. An empty string produces no output.

To permanently change viASP's the output, edit the file at the site packages directory of your environment. Use the command ``which viasp`` to find the directory.

Color Palette
-------------

The color Palette of viASP's frontend is defined by the file `/server/colorPalette.json`.

The default file contains the following JSON object, which defines the colors for all color themes:

.. code-block:: JSON

    {
        "colorThemes": {
            "blue": {
                "primary": "rgba(103, 153, 247, 1)",
                "rowShading": [
                    "rgba(255, 255, 255, 0.5)",
                    "rgba(50, 149, 255, 0.10)"
                ],
                "explanationHighlights": [
                    "rgba(241, 220, 86, 1)",
                    "rgba(243, 160, 72, 1)",
                    "rgba(215, 91, 91, 1)",
                    "rgba(219, 104, 219, 1)",
                    "rgba(137,207,118, 1)"
                ],
                "light": "rgba(255, 255, 255, 1)",
                "dark": "rgba(68, 68, 68, 1)",
                "warn": "rgba(255, 193, 7, 1)",
                "error": "rgba(244, 67, 54, 1)",
                "infoBackground": "rgba(215, 255, 171,  1)"
            },
            "yellow": {
                "primary": "rgba(241, 220, 86, 1)",
                "rowShading": [
                    "rgba(255, 255, 255, 0.5)",
                    "rgba(255, 235, 59, 0.10)"
                ],
                "explanationHighlights": [
                    "rgba(243, 160, 72, 1)",
                    "rgba(215, 91, 91, 1)",
                    "rgba(219, 104, 219, 1)",
                    "rgba(137,207,118, 1)",
                    "rgba(103, 153, 247, 1)"
                ],
                "light": "rgba(255, 255, 255, 1)",
                "dark": "rgba(68, 68, 68, 1)",
                "warn": "rgba(255, 193, 7, 1)",
                "error": "rgba(244, 67, 54, 1)",
                "infoBackground": "rgba(215, 255, 171,  1)"
            },
            "orange": {
                "primary": "rgba(243, 160, 72, 1)",
                "rowShading": [
                    "rgba(255, 255, 255, 0.5)",
                    "rgba(255, 152, 0, 0.10)"
                ],
                "explanationHighlights": [
                    "rgba(215, 91, 91, 1)",
                    "rgba(219, 104, 219, 1)",
                    "rgba(137,207,118, 1)",
                    "rgba(103, 153, 247, 1)",
                    "rgba(241, 220, 86, 1)"
                ],
                "light": "rgba(255, 255, 255, 1)",
                "dark": "rgba(68, 68, 68, 1)",
                "warn": "rgba(255, 193, 7, 1)",
                "error": "rgba(244, 67, 54, 1)",
                "infoBackground": "rgba(215, 255, 171,  1)"
            },
            "red": {
                "primary": "rgba(215, 91, 91, 1)",
                "rowShading": [
                    "rgba(255, 255, 255, 0.5)",
                    "rgba(244, 67, 54, 0.10)"
                ],
                "explanationHighlights": [
                    "rgba(219, 104, 219, 1)",
                    "rgba(137,207,118, 1)",
                    "rgba(103, 153, 247, 1)",
                    "rgba(241, 220, 86, 1)",
                    "rgba(243, 160, 72, 1)"
                ],
                "light": "rgba(255, 255, 255, 1)",
                "dark": "rgba(68, 68, 68, 1)",
                "warn": "rgba(255, 193, 7, 1)",
                "error": "rgba(244, 67, 54, 1)",
                "infoBackground": "rgba(215, 255, 171,  1)"
            },
            "purple": {
                "primary": "rgba(219, 104, 219, 1)",
                "rowShading": [
                    "rgba(255, 255, 255, 0.5)",
                    "rgba(156, 39, 176, 0.10)"
                ],
                "explanationHighlights": [
                    "rgba(137,207,118, 1)",
                    "rgba(103, 153, 247, 1)",
                    "rgba(241, 220, 86, 1)",
                    "rgba(243, 160, 72, 1)",
                    "rgba(215, 91, 91, 1)"
                ],
                "light": "rgba(255, 255, 255, 1)",
                "dark": "rgba(68, 68, 68, 1)",
                "warn": "rgba(255, 193, 7, 1)",
                "error": "rgba(244, 67, 54, 1)",
                "infoBackground": "rgba(215, 255, 171,  1)"
            },
            "green": {
                "primary": "rgba(137,207,118, 1)",
                "rowShading": [
                    "rgba(255, 255, 255, 0.5)",
                    "rgba(76, 175, 80, 0.10)"
                ],
                "explanationHighlights": [
                    "rgba(103, 153, 247, 1)",
                    "rgba(241, 220, 86, 1)",
                    "rgba(243, 160, 72, 1)",
                    "rgba(215, 91, 91, 1)",
                    "rgba(219, 104, 219, 1)"
                ],
                "light": "rgba(255, 255, 255, 1)",
                "dark": "rgba(68, 68, 68, 1)",
                "warn": "rgba(255, 193, 7, 1)",
                "error": "rgba(244, 67, 54, 1)",
                "infoBackground": "rgba(215, 255, 171,  1)"
            }
        }
    }

To permanently change the colors used in a viASP installation, edit the file at the site packages directory of your environment. Use the command `which viasp` to find the directory.
