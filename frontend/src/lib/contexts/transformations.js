import React from 'react';
import {showError, useMessages} from './UserMessages';
import {useSettings} from './Settings';
import PropTypes from 'prop-types';
import {make_default_nodes, make_default_clingraph_nodes, getNextColor} from '../utils/index';

function postCurrentSort(backendURL, oldIndex, newIndex) {
    return fetch(`${backendURL('graph/sorts')}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            moved_transformation: {
                old_index: oldIndex,
                new_index: newIndex,
            },
        }),
    }).then((r) => {
        if (r.ok) {
            return r.json();
        }
        throw new Error(r.statusText);
    });
}

function fetchTransformations(backendURL) {
    return fetch(`${backendURL('graph/sorts')}`).then((r) => {
        if (r.ok) {
            return r.json();
        }
        throw new Error(r.statusText);
    });
}

function fetchSortHash(backendURL) {
    return fetch(`${backendURL('graph/current')}`).then((r) => {
        if (r.ok) {
            return r.json();
        }
        throw new Error(r.statusText);
    });
}

function loadFacts(backendURL) {
    return fetch(`${backendURL('graph/facts')}`).then((r) => {
        if (!r.ok) {
            throw new Error(`${r.status} ${r.statusText}`);
        }
        return r.json();
    });
}

function loadNodeData(hash, backendURL) {
    return fetch(`${backendURL('graph/children')}/${hash}`).then((r) => {
        if (!r.ok) {
            throw new Error(`${r.status} ${r.statusText}`);
        }
        return r.json();
    });
}

function loadClingraphChildren(backendURL) {
    return fetch(`${backendURL('clingraph/children')}`).then((r) => {
        if (!r.ok) {
            throw new Error(`${r.status} ${r.statusText}`);
        }
        return r.json();
    });
}

function loadEdges(shownRecursion, usingClingraph, backendURL) {
    return fetch(`${backendURL('graph/edges')}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            shownRecursion: shownRecursion,
            usingClingraph: usingClingraph,
        }),
    }).then((r) => {
        if (!r.ok) {
            throw new Error(`${r.status} ${r.statusText}`);
        }
        return r.json();
    });
}

const initialState = {
    transformations: [],
    edges: [],
    /** an object mapping transformation ids to a List of Nodes */
    transformationDropIndices: null, 
    currentSort: '',
    transformationNodesMap: null,
    clingraphGraphics: [],
    shownRecursion: [],
    allHighlightedSymbols: [],
    explanationHighlightedSymbols: [],
    explanationHighlightedRules: [],
    searchResultHighlightedSymbols: [],
};

/**
 * Manage Transformation Set
 * */
const ADD_TRANSFORMATION = 'APP/TRANSFORMATIONS/ADD';
const ADD_TRANSFORMATION_SET = 'APP/TRANSFORMATIONS/ADDSET';
const CLEAR_TRANSFORMATIONS = 'APP/TRANSFORMATIONS/CLEAR';
const REORDER_TRANSFORMATION = 'APP/TRANSFORMATIONS/REORDER';
const SET_TRANSFORMATION_DROP_INDICES =
    'APP/TRANSFORMATIONS/SETTRANSFORMATIONDROPINDICES';
const CHECK_TRANSFORMATION_EXPANDABLE_COLLAPSIBLE = 'APP/TRANSFORMATIONS/CHECKTRANSFORMATIONEXPANDABLECOLLAPSIBLE';
const addTransformation = (t) => ({type: ADD_TRANSFORMATION, t});
const addTransformationSet = (ts) => ({type: ADD_TRANSFORMATION_SET, ts});
const clearTransformations = (t) => ({type: CLEAR_TRANSFORMATIONS});
const reorderTransformation = (oldIndex, newIndex) => ({
    type: REORDER_TRANSFORMATION,
    oldIndex,
    newIndex,
});
const setTransformationDropIndices = (t) => ({
    type: SET_TRANSFORMATION_DROP_INDICES,
    t,
});
const checkTransformationExpandableCollapsible = (tid) => ({type: CHECK_TRANSFORMATION_EXPANDABLE_COLLAPSIBLE, tid});
/**
 * Manage Sorts 
 * */
const ADD_SORT = 'APP/SORT/ADD';
const SET_CURRENT_SORT = 'APP/TRANSFORMATIONS/SETCURRENTSORT';
const addSort = (s) => ({type: ADD_SORT, s});
const setCurrentSort = (s) => ({type: SET_CURRENT_SORT, s});
/**
 * Manage Nodes
*/
const SET_NODES = 'APP/NODES/SET';
const CLEAR_NODES = 'APP/NODES/CLEAR';
const setNodes = (nodesRes, t) => ({type: SET_NODES, nodesRes, t});
const clearNodes = () => ({type: CLEAR_NODES});
/**
 * Manage Edges
*/
const SET_EDGES = 'APP/EDGES/SET';
const CLEAR_EDGES = 'APP/EDGES/CLEAR';
const setEdges = (e) => ({type: SET_EDGES, e});
const clearEdges = () => ({type: CLEAR_EDGES});
/**
 * Manage Shown Transformations
 * */
const HIDE_TRANSFORMATION = 'APP/TRANSFORMATIONS/HIDE';
const SHOW_TRANSFORMATION = 'APP/TRANSFORMATIONS/SHOW';
const TOGGLE_TRANSFORMATION = 'APP/TRANSFORMATIONS/TOGGLE';
const SHOW_ONLY_TRANSFORMATION = 'APP/TRANSFORMATIONS/ONLY';
const hideTransformation = (t) => ({type: HIDE_TRANSFORMATION, t});
const showTransformation = (t) => ({type: SHOW_TRANSFORMATION, t});
const toggleTransformation = (t) => ({type: TOGGLE_TRANSFORMATION, t});
const showOnlyTransformation = (t) => ({type: SHOW_ONLY_TRANSFORMATION, t});
/**
 * Manage Shown Recursion
 */
const TOGGLE_SHOWN_RECURSION = 'APP/TRANSFORMATIONS/RECURSION/TOGGLE';
const CLEAR_SHOWN_RECURSION = 'APP/TRANSFORMATIONS/RECURSION/CLEAR';
const toggleShownRecursion = (n) => ({type: TOGGLE_SHOWN_RECURSION, n});
const clearShownRecursion = () => ({type: CLEAR_SHOWN_RECURSION});
/**
 * Manage Node Expansion (vertical overflow)
 * */
const SET_NODE_IS_EXPANDABLE_V = 'APP/NODE/OVERFLOWV/SETEXPANDABLE';
const SET_NODE_IS_COLLAPSIBLE_V = 'APP/NODE/OVERFLOWV/SETCOLLAPSIBLE';
const SET_NODE_IS_EXPAND_ALL_THE_WAY = 'APP/NODE/OVERFLOWV/SETEXPANDALLTHEWAY';
const setNodeIsExpandableV = (tid, uuid, v) => ({type: SET_NODE_IS_EXPANDABLE_V, tid, uuid, v});
const setNodeIsCollapsibleV = (tid, uuid, v) => ({type: SET_NODE_IS_COLLAPSIBLE_V, tid, uuid, v});
const setNodeIsExpandAllTheWay = (tid, uuid, v) => ({type: SET_NODE_IS_EXPAND_ALL_THE_WAY, tid, uuid, v});
/**
 * Manage Node Overflow Horizontal
 */
const SET_NODE_SHOW_MINI = 'APP/NODE/OVERFLOWH/SETSHOWMINI';
const setNodeShowMini = (tid, uuid, v) => ({type: SET_NODE_SHOW_MINI, tid, uuid, v});
/**
 * Manage Clingraph
*/
const SET_CLINGRAPH_GRAPHICS = 'APP/CLINGRAPH/SETGRAPHICS';
const CLEAR_CLINGRAPH_GRAHICS = 'APP/CLINGRAPH/CLEAR';
const SET_CLINGRAPH_SHOW_MINI = 'APP/CLINGRAPH/OVERFLOWH/SETSHOWMINI';
const setClingraphGraphics = (g) => ({type: SET_CLINGRAPH_GRAPHICS, g});
const clearClingraphGraphics = () => ({type: CLEAR_CLINGRAPH_GRAHICS});
const setClingraphShowMini = (uuid, v) => ({type: SET_CLINGRAPH_SHOW_MINI, uuid, v});
/**
 * Manage Highlighted Symbols from Explanation
 * */
const ADD_EXPLANATION_OF_SYMBOL = 'APP/SYMBOL/EXPLANATION/ADD';
const REMOVE_EXPLANATION_OF_SYMBOL = 'APP/SYMBOL/EXPLANATION/REMOVE';
const TOGGLE_EXPLANATION_OF_SYMBOL = 'APP/SYMBOL/EXPLANATION/TOGGLE';
const CLEAR_EXPLANATIONS = 'APP/SYMBOL/EXPLANATION/CLEAR';
const addExplanationHighlightedSymbol = (
    arrows,
    rule_hash,
    source_symbol_id,
    colors
) => ({
    type: ADD_EXPLANATION_OF_SYMBOL,
    arrows,
    rule_hash,
    source_symbol_id,
    colors,
});
const removeExplanationHighlightedSymbol = (
    arrows,
    rule_hash,
    source_symbol_id,
) => ({
    type: REMOVE_EXPLANATION_OF_SYMBOL,
    arrows,
    rule_hash,
    source_symbol_id,
});
const toggleExplanationHighlightedSymbol = (
    arrows,
    rule_hash,
    source_symbol_id,
    colors
) => ({
    type: TOGGLE_EXPLANATION_OF_SYMBOL,
    arrows,
    rule_hash,
    source_symbol_id,
    colors,
});
const clearExplanationHighlightedSymbol = () => ({type: CLEAR_EXPLANATIONS});
/**
 * Manage Highlighted Rules from Explanation
 */
const REMOVE_HIGHLIGHT_EXPLANATION_RULE_INTERNAL = 'APP/RULE/EXPLANATION/REMOVE/INTERNAL';
const UNMARK_FOR_INSERTION_EXPLANATION_RULE = 'APP/RULE/EXPLANATION/UNMARKFORINSERTION';
const MARK_FOR_DELETION_EXPLANATION_RULE = 'APP/RULE/EXPLANATION/MARKFORDELETION';
const REMOVE_RULE_BACKGROUND_HIGHLIGHT = 'APP/RULE/EXPLANATION/RULEBACKGROUND/REMOVE';
const removeHighlightExplanationRule = (rule_hash, source_symbol_id) => ({
    type: REMOVE_HIGHLIGHT_EXPLANATION_RULE_INTERNAL,
    rule_hash,
    source_symbol_id,
});
const unmarkInsertedSymbolHighlightDot = (hash, color, ruleDotHighlightColor) => ({
    type: UNMARK_FOR_INSERTION_EXPLANATION_RULE,
    hash,
    color,
    ruleDotHighlightColor,
});
const removeDeletedSymbolHighlightDot = (hash, color, ruleDotHighlightColor) => ({
    type: MARK_FOR_DELETION_EXPLANATION_RULE,
    hash,
    color,
    ruleDotHighlightColor,
});
const removeExplanationRuleBackgroundHighlight = (rule_hash, source_symbol_id) => ({
    type: REMOVE_RULE_BACKGROUND_HIGHLIGHT,
    rule_hash,
    source_symbol_id,
});

/**
 * Manage Highlighted Symbols from Search
 * */
const ADD_SEARCH_RESULT_HIGHLIGHTED_SYMBOL = 'APP/SYMBOL/SEARCH/ADD';
const REMOVE_SEARCH_RESULT_HIGHLIGHTED_SYMBOL = 'APP/SYMBOL/SEARCH/REMOVE';
const ROTATE_SEARCH_RESULT_HIGHLIGHTED_SYMBOL = 'APP/SYMBOL/SEARCH/ROTATE';
const UNSET_RECENT_SEARCH_RESULT_HIGHLIGHTED_SYMBOL = 'APP/SYMBOL/SEARCH/UNSETRECENT';
const SET_RECENT_SEARCH_RESULT_HIGHLIGHTED_SYMBOL = 'APP/SYMBOL/SEARCH/SETRECENT';
const CLEAR_SEARCH_RESULT_HIGHLIGHTED_SYMBOLS = 'APP/SYMBOL/SEARCH/CLEAR';
const addSearchResultHighlightedSymbol = (s, colors) => ({type: ADD_SEARCH_RESULT_HIGHLIGHTED_SYMBOL, s, colors});
const removeSearchResultHighlightedSymbol = (s) => ({type: REMOVE_SEARCH_RESULT_HIGHLIGHTED_SYMBOL, s});
const rotateSearchResultHighlightedSymbol = (symbol, direction) => ({
    type: ROTATE_SEARCH_RESULT_HIGHLIGHTED_SYMBOL,
    symbol,
    direction,
});
const unsetRecentSearchResultHighlightedSymbol = (s) => ({type: UNSET_RECENT_SEARCH_RESULT_HIGHLIGHTED_SYMBOL, s});
const clearSearchResultHighlightedSymbol = () => ({type: CLEAR_SEARCH_RESULT_HIGHLIGHTED_SYMBOLS});


const TransformationContext = React.createContext();

const transformationReducer = (state = initialState, action) => {
    if (action.type === ADD_TRANSFORMATION) {
        return {
            ...state,
            transformations: state.transformations.concat({
                ...action.t,
                rules: action.t.rules.str_.map((r) => ({_type: "RuleWrapper", rule: r, highlight: false})),
                shown: true,
                isExpandableV: false,
                isCollapsibleV: false,
                allNodesShowMini: false,
            }),
        };
    }
    if (action.type === ADD_TRANSFORMATION_SET) {
        return {
            ...state,
            transformations: action.ts.map((t) => ({
                ...t,
                rules: t.rules.str_.map((r,i) => ({_type: "RuleWrapper", rule: r, hash: t.rules.hash[i]})),
                shown: true,
                isExpandableV: false,
                isCollapsibleV: false,
                allNodesShowMini: false,
            })),
        };
    }
    if (action.type === SET_NODE_IS_EXPANDABLE_V) {
        return state.transformationNodesMap && action.tid !== null ? {
            ...state,
            transformationNodesMap: {
                ...state.transformationNodesMap, 
                [action.tid]: state.transformationNodesMap[action.tid]?.map((node) => {
                        if (node.uuid === action.uuid) {
                            return {
                                ...node,
                                isExpandableV: action.v,
                            };
                        }
                        if (node.recursive) {
                            return {
                                ...node,
                                recursive: node.recursive.map((subnode) => {
                                    if (subnode.uuid === action.uuid) {
                                        return {
                                            ...subnode,
                                            isExpandableV: action.v,
                                        }
                                    }
                                    return subnode
                                }),
                            }
                        }
                        return node;
                    })
                }
            } : state
    }
    if (action.type === SET_NODE_IS_COLLAPSIBLE_V) {
        return state.transformationNodesMap && action.tid !== null ? {
            ...state,
            transformationNodesMap: {
                ...state.transformationNodesMap, 
                [action.tid]: state.transformationNodesMap[action.tid]?.map((node) => {
                        if (node.uuid === action.uuid) {
                            return {
                                ...node,
                                isCollapsibleV: action.v,
                            };
                        }
                        if (node.recursive) {
                            return {
                                ...node,
                                recursive: node.recursive.map((subnode) => {
                                    if (subnode.uuid === action.uuid) {
                                        return {
                                            ...subnode,
                                            isCollapsibleV: action.v,
                                        }
                                    }
                                    return subnode
                                }),
                            }
                        }
                        return node;
                    })
                }
            } : state
    }
    if (action.type === SET_NODE_IS_EXPAND_ALL_THE_WAY) {
        return state.transformationNodesMap && action.tid !== null ? {
            ...state,
            transformationNodesMap: {
                ...state.transformationNodesMap, 
                [action.tid]: state.transformationNodesMap[action.tid]?.map((node) => {
                        if (node.uuid === action.uuid) {
                            return {
                                ...node,
                                isExpandVAllTheWay: action.v,
                            };
                        }
                        if (node.recursive) {
                            return {
                                ...node,
                                recursive: node.recursive.map((subnode) => {
                                    if (subnode.uuid === action.uuid) {
                                        return {
                                            ...subnode,
                                            isExpandVAllTheWay: action.v,
                                        }
                                    }
                                    return subnode
                                }),
                            }
                        }
                        return node;
                    })
                }
            } : state
    }
    if (action.type === SET_NODE_SHOW_MINI) {
        return state.transformationNodesMap && action.tid !== null ? {
            ...state,
            transformationNodesMap: {
                ...state.transformationNodesMap, 
                [action.tid]: state.transformationNodesMap[action.tid]?.map((node) => {
                        if (node.uuid === action.uuid) {
                            return {
                                ...node,
                                showMini: action.v,
                            };
                        }
                        if (node.recursive) {
                            return {
                                ...node,
                                recursive: node.recursive.map((subnode) => {
                                    if (subnode.uuid === action.uuid) {
                                        return {
                                            ...subnode,
                                            showMini: action.v,
                                        }
                                    }
                                    return subnode
                                }),
                            }
                        }
                        return node;
                    })
                }
            } : state
    }       
    if (action.type === CLEAR_TRANSFORMATIONS) {
        return {
            ...state,
            transformations: [],
        };
    }
    if (action.type === SHOW_ONLY_TRANSFORMATION) {
        return {
            ...state,
            transformations: state.transformations.map((container) =>
                container.id !== action.t.id
                    ? {
                          ...container,
                          shown: false,
                      }
                    : {
                          ...container,
                          shown: true,
                      }
            ),
        };
    }
    if (action.type === SHOW_TRANSFORMATION) {
        return {
            ...state,
            transformations: state.transformations.map((container) =>
                container.id === action.t.id
                    ? {
                          ...container,
                          shown: true,
                      }
                    : container
            ),
        };
    }
    if (action.type === HIDE_TRANSFORMATION) {
        return {
            ...state,
            transformations: state.transformations.map((container) =>
                container.id === action.t.id
                    ? {
                          ...container,
                          shown: false,
                      }
                    : container
            ),
        };
    }
    if (action.type === TOGGLE_TRANSFORMATION) {
        return {
            ...state,
            transformations: state.transformations.map((container) =>
                container.id === action.t.id
                    ? {
                        ...container,
                        shown: !container.shown,
                      }
                    : container
            ),
        };
    }
    if (action.type === REORDER_TRANSFORMATION) {
        let transformations = [...state.transformations];
        const [removed] = transformations.splice(action.oldIndex, 1);
        transformations.splice(action.newIndex, 0, removed);
        transformations = transformations.map((container, i) => {
            return {
                ...container,
                id: i
            };
        });

        let nodesMap = Object.values(state.transformationNodesMap);
        const [removedNodes] = nodesMap.splice(action.oldIndex, 1);
        nodesMap.splice(action.newIndex, 0, removedNodes);
        nodesMap = nodesMap.reduce((obj, key, i) => {
            obj[key] = Object.values(nodesMap)[i];
            return obj;
        }, {});
        return {
            ...state,
            transformations: transformations,
            transformationNodesMap: nodesMap,
        };
    }
    if (action.type === ADD_SORT) {
        return {
            ...state,
            currentSort: action.s,
        };
    }
    if (action.type === SET_CURRENT_SORT) {
        return {
            ...state,
            currentSort: action.s,
        };
    }
    if (action.type === SET_NODES) {
        return {
            ...state,
            transformationNodesMap: action.nodesRes.reduce(
                (map, items, i) => {
                    map[action.t[i].id] = items.map(
                        (node) => {
                            return {
                                ...node,
                                recursive: node.recursive.map((n) => ({
                                    ...n,
                                    loading: false,
                                    shownRecursion: false,
                                    isExpandableV: false,
                                    isCollapsibleV: false,
                                    isExpandVAllTheWay: false,  
                                    showMini: false,
                                })),
                                loading: false,
                                shownRecursion: false,
                                isExpandableV: false,
                                isCollapsibleV: false,
                                isExpandVAllTheWay: false,
                                showMini: false,
                                };
                            }
                        );
                        return map;
                    },
                    {}
                ),
        };
    }
    if (action.type === CLEAR_NODES) {
        if (state.transformationNodesMap === null) {
            return {
                ...state,
                transformationNodesMap: state.transformations.map((n) => {
                    return make_default_nodes();
                }),
            };
        }
        return {
            ...state,
            transformationNodesMap: Object.keys(
                state.transformationNodesMap
            ).reduce((obj, key) => {
                obj[key] = make_default_nodes(
                    state.transformationNodesMap[key]
                );
                return obj;
            }, {}),
        };
    }
    if (action.type === SET_CLINGRAPH_GRAPHICS) {
        return {
            ...state,
            clingraphGraphics: action.g.map((n,i) => {
                n.loading = false;
                n.showMini = false;
                const last_transformation_index = Math.max(...Object.keys(state.transformationNodesMap).map(k => parseInt(k, 10)))
                n.space_multiplier = state.transformationNodesMap[last_transformation_index][i].space_multiplier;
                return n;
            }),
        };
    }
    if (action.type === CLEAR_CLINGRAPH_GRAHICS) {
        if (state.clingraphGraphics === null) {
            return {
                ...state,
            };
        }
        return {
            ...state,
            clingraphGraphics: make_default_clingraph_nodes(
                state.clingraphGraphics
            ),
        };
    }
    if (action.type === SET_CLINGRAPH_SHOW_MINI) {
        return {
            ...state,
            clingraphGraphics: state.clingraphGraphics.map((node) => {
                if (node.uuid === action.uuid) {
                    return {
                        ...node,
                        showMini: action.v,
                    };
                }
                return node;
            }),
        };
    }
    if (action.type === SET_TRANSFORMATION_DROP_INDICES) {
        return {
            ...state,
            transformationDropIndices: action.t,
        };
    }
    if (action.type === CHECK_TRANSFORMATION_EXPANDABLE_COLLAPSIBLE) {
        return action.tid !== null ? {
            ...state,
            transformations: state.transformations.map((container) => {
                if (container.id === action.tid) {
                    container.isExpandableV = state.transformationNodesMap[action.tid]?.some((node) => node.isExpandableV);
                    container.isCollapsibleV = state.transformationNodesMap[action.tid]?.some((node) => node.isCollapsibleV);
                    container.allNodesShowMini = state.transformationNodesMap[action.tid]?.every((node) => node.showMini);
                }
                return container;
            }),
        } : state;
    }
    if (action.type === SET_EDGES) {
        return {
            ...state,
            edges: action.e,
        };
    }
    if (action.type === CLEAR_EDGES) {
        return {
            ...state,
            edges: [],
        };
    }
    if (action.type === TOGGLE_SHOWN_RECURSION) {
        let shownRecursion = [...state.shownRecursion];
        if (shownRecursion.includes(action.n)) {
            shownRecursion = shownRecursion.filter((n) => n !== action.n);
        } else {
            shownRecursion.push(action.n);
        }

        const transformationNodesMap = Object.keys(state.transformationNodesMap)
            .reduce((obj, key) => {
            obj[key] = state.transformationNodesMap[key].map((node) => {
                if (node.uuid === action.n) {
                    return {
                        ...node,
                        shownRecursion: !node.shownRecursion,
                    };
                }
                return node;
            });
            return obj;
        }, {});
        return {
            ...state,
            transformationNodesMap: transformationNodesMap,
            shownRecursion: shownRecursion,
        };
    }
    if (action.type === CLEAR_SHOWN_RECURSION) {
        return {
            ...state,
            shownRecursion: [],
        };
    }
    if (action.type === ADD_EXPLANATION_OF_SYMBOL) {
        const nextColor = getNextColor(
            state.explanationHighlightedSymbols,
            state.searchResultHighlightedSymbols,
            action.colors
        );
        /* ADD SYMBOL HIGHLIGHT */
        const updatedExplanationHighlightedSymbols = state.explanationHighlightedSymbols.concat(
            action.arrows.map((arrow) => ({
                src: arrow.src,
                tgt: arrow.tgt,
                color: nextColor,
            }))
        );

        const updatedAllHighlightedSymbols =
            updatedExplanationHighlightedSymbols
                .map((item) => item.src)
                .concat(
                    updatedExplanationHighlightedSymbols.map((item) => item.tgt)
                )
                .concat(
                    state.allHighlightedSymbols
                );

        /* ADD RULE HIGHLIGHT */
        const new_rule_highlight = {
            rule_hash: action.rule_hash,
            color: nextColor,
            shown: true,
            source_id: action.source_symbol_id,
            ruleBackgroundHighlight: nextColor,
        };
        const newRuleHighlight = state.explanationHighlightedRules.map((rule) => {
                if (rule.rule_hash === action.rule_hash && rule.ruleBackgroundHighlight !== 'transparent') {
                    return {
                        ...rule,
                        ruleBackgroundHighlight: 'transparent'
                }}
                return rule
            });
        newRuleHighlight.push(new_rule_highlight);

        return {
            ...state,
            allHighlightedSymbols: updatedAllHighlightedSymbols,
            explanationHighlightedSymbols: updatedExplanationHighlightedSymbols,
            explanationHighlightedRules: newRuleHighlight,
        };
    }
    if (action.type === REMOVE_EXPLANATION_OF_SYMBOL) {
        /* REMOVE SYMBOL HIGHLIGHT */
        const updatedExplanationHighlightedSymbols = action.arrows.reduce(
            (acc, arrow) => {
                const index = acc.findIndex(
                    (symbol) =>
                        symbol.src === arrow.src && symbol.tgt === arrow.tgt
                );

                if (index !== -1) {
                    return acc.filter(
                        (symbol) =>
                            symbol.src !== arrow.src || symbol.tgt !== arrow.tgt
                    );
                }
                return acc;
            },
            state.explanationHighlightedSymbols
        );

        const updatedAllHighlightedSymbols =
            updatedExplanationHighlightedSymbols
                .map((item) => item.src)
                .concat(
                    updatedExplanationHighlightedSymbols.map(
                        (item) => item.tgt
                    )
                )
                .concat(state.allHighlightedSymbols);

        /* MARK FOR REMOVAL RULE HIGHLIGHT */
        const newRuleHighlight = state.explanationHighlightedRules.map(
            (rule) => {
                if (
                    rule.rule_hash === action.rule_hash &&
                    rule.source_id === action.source_symbol_id
                ) {
                    return {
                        ...rule,
                        shown: false,
                        ruleBackgroundHighlight: 'transparent',
                    };
                }
                return rule;
            }
        );

        return {
            ...state,
            allHighlightedSymbols: updatedAllHighlightedSymbols,
            explanationHighlightedSymbols:
                updatedExplanationHighlightedSymbols,
            explanationHighlightedRules: newRuleHighlight,
        };
    }
    if (action.type === REMOVE_HIGHLIGHT_EXPLANATION_RULE_INTERNAL) {
        const newRuleHighlight = state.explanationHighlightedRules.filter(
            (rule) => !(rule.rule_hash === action.rule_hash && rule.source_id === action.source_symbol_id));

        return {
            ...state,
            explanationHighlightedRules: newRuleHighlight,
        };
    }
    if (action.type === REMOVE_RULE_BACKGROUND_HIGHLIGHT) {
        /* MARK FOR REMOVAL RULE HIGHLIGHT */
        const newRuleHighlight = state.explanationHighlightedRules.map(
            (rule) => {
                if (
                    rule.rule_hash === action.rule_hash &&
                    rule.source_id === action.source_symbol_id
                ) {
                    return {
                        ...rule,
                        ruleBackgroundHighlight: 'transparent',
                    };
                }
                return rule;
            }
        );

        return {
            ...state,
            explanationHighlightedRules: newRuleHighlight,
        };
    }
    if (action.type === TOGGLE_EXPLANATION_OF_SYMBOL) {
        const nextColor = getNextColor(
            state.explanationHighlightedSymbols,
            state.searchResultHighlightedSymbols,
            action.colors
        );
        /* TOGGLE SYMBOL HIGHLIGHT */
        const updatedExplanationHighlightedSymbols = action.arrows.reduce((acc, arrow) => {
            const index = acc.findIndex(
                (symbol) => symbol.src === arrow.src && symbol.tgt === arrow.tgt
            );

            if (index !== -1) {
                return acc.filter(
                    (symbol) =>
                        symbol.src !== arrow.src || symbol.tgt !== arrow.tgt
                );
            }
            return [
                ...acc,
                {
                    src: arrow.src,
                    tgt: arrow.tgt,
                    color: nextColor,
                },
            ];
        }, state.explanationHighlightedSymbols);

        const updatedAllHighlightedSymbols =
            updatedExplanationHighlightedSymbols
                .map((item) => item.src)
                .concat(
                    updatedExplanationHighlightedSymbols.map((item) => item.tgt)
                )
                .concat(
                    state.searchResultHighlightedSymbols.map(
                        (item) => item.includes[item.selected].symbol_uuid
                    )
                );

        /* TOGGLE RULE HIGHLIGHT */
        const new_rule_highlight = {
            rule_hash: action.rule_hash,
            color: nextColor,
            markedForInsertion: true,
            markedForDeletion: false,
            shown: true,
            source_id: action.source_symbol_id,
        };
        const ruleHighlightExists = state.explanationHighlightedRules.some(rule =>
            rule.rule_hash === new_rule_highlight.rule_hash &&
            rule.source_id === new_rule_highlight.source_id
        );
        const newRuleHighlight = ruleHighlightExists 
            ? state.explanationHighlightedRules.map(rule => {
                if (rule.rule_hash === new_rule_highlight.rule_hash && rule.source_id === new_rule_highlight.source_id) {
                    return {
                        ...rule,
                        shown: false,
                    };
                }
                return rule;
            }) 
            : state.explanationHighlightedRules.concat(new_rule_highlight);
        

        return {
            ...state,
            allHighlightedSymbols: updatedAllHighlightedSymbols,
            explanationHighlightedSymbols: updatedExplanationHighlightedSymbols,
            explanationHighlightedRules: newRuleHighlight,
        };
    }
    if (action.type === CLEAR_EXPLANATIONS) {
        return {
            ...state,
            allHighlightedSymbols: state.searchResultHighlightedSymbols.map(
                        (item) => item.includes[item.selected].symbol_uuid
                    ),
            explanationHighlightedSymbols: [],
            explanationHighlightedRules: [],
        };
    }
    if (action.type === ADD_SEARCH_RESULT_HIGHLIGHTED_SYMBOL) {
        const nextColor = getNextColor(
            state.explanationHighlightedSymbols,
            state.searchResultHighlightedSymbols,
            action.colors
        );
        const updatedSearchResultHighlightedSymbols = state.searchResultHighlightedSymbols.concat({
                ...action.s,
                color: nextColor,
                recent: true,
                selected: 0,
                scrollable: action.s.includes.length > 1,
            });
        const updatedAllHighlightedSymbols = state.explanationHighlightedSymbols
            .map((item) => item.src)
            .concat(state.explanationHighlightedSymbols.map((item) => item.tgt))
            .concat(
                updatedSearchResultHighlightedSymbols.map(
                    (item) => item.includes[item.selected].symbol_uuid
                )
            );
        return {
            ...state,
            allHighlightedSymbols: updatedAllHighlightedSymbols,
            searchResultHighlightedSymbols: updatedSearchResultHighlightedSymbols
        };
    }
    if (action.type === REMOVE_SEARCH_RESULT_HIGHLIGHTED_SYMBOL) {
        const updatedSearchResultHighlightedSymbols = state.searchResultHighlightedSymbols.filter(
                (symbol) => symbol.repr !== action.s.repr
            );
        const updatedAllHighlightedSymbols = state.explanationHighlightedSymbols
            .map((item) => item.src)
            .concat(state.explanationHighlightedSymbols.map((item) => item.tgt))
            .concat(
                updatedSearchResultHighlightedSymbols.map(
                    (item) => item.includes[item.selected].symbol_uuid
                )
            );
        return {
            ...state,
            allHighlightedSymbols: updatedAllHighlightedSymbols,
            searchResultHighlightedSymbols: updatedSearchResultHighlightedSymbols
        };
    }
    if (action.type === ROTATE_SEARCH_RESULT_HIGHLIGHTED_SYMBOL) {
        const updatedSearchResultHighlightedSymbols = state.searchResultHighlightedSymbols.map((s) => {
            if (s.repr === action.symbol.repr) {
                return {
                    ...s,
                    selected: s.selected + action.direction,
                    recent: true,
                };
            }
            return s;
        });
        const updatedAllHighlightedSymbols = state.explanationHighlightedSymbols
            .map((item) => item.src)
            .concat(state.explanationHighlightedSymbols.map((item) => item.tgt))
            .concat(
                updatedSearchResultHighlightedSymbols.map(
                    (item) => item.includes[item.selected].symbol_uuid
                )
            );
        
        return {
            ...state,
            allHighlightedSymbols: updatedAllHighlightedSymbols,
            searchResultHighlightedSymbols: updatedSearchResultHighlightedSymbols
        };
    }
    if (action.type === SET_RECENT_SEARCH_RESULT_HIGHLIGHTED_SYMBOL) {
        return {
            ...state,
            searchResultHighlightedSymbols: state.searchResultHighlightedSymbols.map((s) => {
                if (s.repr === action.s.repr) {
                    return {
                        ...s,
                        recent: true,
                    };
                }
                return s;
            }),
        };
    }
    if (action.type === UNSET_RECENT_SEARCH_RESULT_HIGHLIGHTED_SYMBOL) {
        return {
            ...state,
            searchResultHighlightedSymbols: state.searchResultHighlightedSymbols.map((s) => {
                if (s.repr === action.s.repr) {
                    return {
                        ...s,
                        recent: false,
                    };
                }
                return s;
            }),
        };
    }
    if (action.type === CLEAR_SEARCH_RESULT_HIGHLIGHTED_SYMBOLS) {
        return {
            ...state,
            searchResultHighlightedSymbols: [],
        };
    }
    if (action.type === UNMARK_FOR_INSERTION_EXPLANATION_RULE) {
        return {
            ...state,
            explanationHighlightedRules: state.explanationHighlightedRules.map(rule => {
                if (rule.rule_hash === action.hash && rule.color === action.color) {
                    return {
                        ...rule,
                        markedForInsertion: false,
                    };
                }
                return rule;
            }),
        };
    }
    return {...state};
};




const TransformationProvider = ({children}) => {
    const [, message_dispatch] = useMessages();
    const {backendURL} = useSettings();
    const [state, dispatch] = React.useReducer(
        transformationReducer,
        initialState
    );

    const backendUrlRef = React.useRef(backendURL);
    const messageDispatchRef = React.useRef(message_dispatch);

    const loadTransformationNodesMap = (items) => {
        dispatch(clearNodes());
        dispatch(clearClingraphGraphics());
        const transformations = items.map((t) => ({id: t.id, hash: t.hash}));
        const promises = transformations.map((t) =>
            loadNodeData(t.hash, backendUrlRef.current)
        );

        // load facts
        promises.push(loadFacts(backendUrlRef.current));
        transformations.push({id: -1});
        // load clingraph
        promises.push(loadClingraphChildren(backendUrlRef.current));

        // Wait for all promises to resolve
        return Promise.all(promises);
    };

    const reloadEdges = (shownRecursion, usingClingraph) => {
        loadEdges(
                shownRecursion,
                usingClingraph,
                backendUrlRef.current
            )
                .catch((error) => {
                    messageDispatchRef.current(
                        showError(`Failed to get edges: ${error}`)
                    );
                })
                .then((items) => {
                    dispatch(setEdges(items));
                });
    }


    const fetchGraph = (shownRecursion) => {
        fetchTransformations(backendUrlRef.current)
            .catch((error) => {
                messageDispatchRef.current(
                    showError(`Failed to get transformations: ${error}`)
                );
            })
            .then((items) => {
                dispatch(clearTransformations());
                dispatch(addTransformationSet(items));
                loadTransformationNodesMap(items)
                    .catch((error) => {
                        messageDispatchRef.current(
                            showError(`Failed to get nodes: ${error}`)
                        );
                    })
                    .then((allItems) => {
                        const nodesRes = allItems.slice(0, allItems.length - 1);
                        const clingraphNodes = allItems[allItems.length - 1];

                        const transformations = [
                            ...items.map((t) => ({id: t.id})),
                            {id: -1},
                        ];

                        dispatch(setNodes(nodesRes, transformations));
                        dispatch(setClingraphGraphics(clingraphNodes));
                        reloadEdges(shownRecursion, clingraphNodes.length > 0);
                   });
            });
    };
    const fetchGraphRef = React.useRef(fetchGraph);

    const setSortAndFetchGraph = (oldIndex, newIndex) => {
        dispatch(clearEdges())
        dispatch(clearNodes())
        dispatch(reorderTransformation(oldIndex, newIndex));
        dispatch(clearShownRecursion());
        postCurrentSort(backendUrlRef.current, oldIndex, newIndex)
            .catch((error) => {
                messageDispatchRef.current(
                    showError(`Failed to set new current graph: ${error}`)
                );
            })
            .then((r) => {
                if (r && r.hash) {
                    dispatch(setCurrentSort(r.hash));
                }
                fetchGraph(
                    state.shownRecursion,
                    state.clingraphGraphics.length > 0
                );
            });
    };

    React.useEffect(() => {
        let mounted = true;
        fetchSortHash(backendUrlRef.current)
            .catch((error) => {
                messageDispatchRef.current(
                    showError(`Failed to get dependency sorts: ${error}`)
                );
            })
            .then((hash) => {
                if (mounted) {
                    dispatch(addSort(hash));
                }
            });
        fetchGraphRef.current([]);
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <TransformationContext.Provider
            value={{
                state,
                dispatch,
                setSortAndFetchGraph,
                reloadEdges,
            }}
        >
            {children}
        </TransformationContext.Provider>
    );
};

const useTransformations = () => React.useContext(TransformationContext);

TransformationProvider.propTypes = {
    /**
     * The subtree that requires access to this context.
     */
    children: PropTypes.element,
};
export {
    TransformationProvider,
    TransformationContext,
    useTransformations,
    toggleTransformation,
    showOnlyTransformation,
    reorderTransformation,
    setTransformationDropIndices,
    toggleShownRecursion,
    setNodeIsExpandableV,
    setNodeIsCollapsibleV,
    setNodeIsExpandAllTheWay,
    setNodeShowMini,
    setClingraphShowMini,
    checkTransformationExpandableCollapsible,
    addSearchResultHighlightedSymbol,
    unsetRecentSearchResultHighlightedSymbol,
    removeSearchResultHighlightedSymbol,
    rotateSearchResultHighlightedSymbol,
    clearExplanationHighlightedSymbol,
    clearSearchResultHighlightedSymbol,
    addExplanationHighlightedSymbol,
    removeExplanationHighlightedSymbol,
    removeHighlightExplanationRule,
    toggleExplanationHighlightedSymbol,
    unmarkInsertedSymbolHighlightDot,
    removeDeletedSymbolHighlightDot,
    removeExplanationRuleBackgroundHighlight,
};
