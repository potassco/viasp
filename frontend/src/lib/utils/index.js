import {v4 as uuidv4} from 'uuid';

export function make_atoms_string(atoms) {
    if (Array.isArray(atoms)) {
        return atoms.map(make_atoms_string).join(' ');
    }
    switch (atoms._type) {
        case 'Number':
            return atoms.number.toString();
        case 'Function': {
            const args = atoms.arguments.map(make_atoms_string).join(',');
            return args.length > 0 ? `${atoms.name}(${args})` : `${atoms.name}`;
        }
        case 'SymbolIdentifier':
            return make_atoms_string(atoms.symbol);
        case 'String':
            return `"${atoms.string}"`;
        case 'Infimum':
            return `#inf`;
        case 'Supremum':
            return `#sup`;
        default:
            throw new TypeError(`Unimplemented type ${atoms._type}`);
    }
}

export function make_rules_string(rule) {
    // TODO: This is pretty bad. Adjust types for this.
    return rule.join(' ');
}

export function make_default_nodes(oldNodes = []) {
    if (oldNodes.length > 0) {
        return oldNodes.map((node, i) => {
            return {
                ...node,
                loading: true,
            };
        });
    }

    const nodeSymbolUpperBound = 20;
    const nodes = [];
    const count = Math.floor(Math.random() * 2) + 1;
    const symbolCount = Math.floor(Math.random() * nodeSymbolUpperBound) + 3;
    for (let i = 0; i < count; i++) {
        const diff = Array.from({length: symbolCount}, (_, i) => {
            return {
                _type: 'SymbolIdentifier',
                symbol: {
                    _type: 'Function',
                    arguments: [],
                    name: `a(${i})`,
                    positive: true,
                },
                has_reason: false,
                uuid: `${uuidv4()}-loading-${i}`,
            };
        });
        nodes.push({
            _type: 'Node',
            recursive: [],
            uuid: `${uuidv4()}-loading-${i}`,
            atoms: diff,
            diff: diff,
            rule_nr: 0,
            reason: {},
            space_multiplier: 0.5,
            loading: true,
        });
    }
    return nodes;
}

export function make_default_clingraph_nodes(oldNodes = []) {
    if (oldNodes.length > 0) {
        return oldNodes.map((node, i) => {
            return {
                ...node,
                uuid: `${node.uuid}`,
                loading: true,
            };
        });
    }

    const nodes = [];
    const count = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < count; i++) {
        nodes.push({
            _type: 'ClingraphNode',
            uuid: `${uuidv4()}-loading-${i}`,
            loading: true,
        });
    }
    return nodes;
}

export function findChildByClass(element, className) {
    if (element.classList.contains(className)) {
        return element;
    }

    for (const child of element.children) {
        const found = findChildByClass(child, className);
        if (found) {
            return found;
        }
    }

    return null;
}

export function emToPixel(em) {
    return em * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export function pixelToEm(px) {
    return px / parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export function getNextColor(
    currentExplanationHighlightedSymbol,
    currentSearchResultHighlightedSymbol,
    colorArray
) {
    const arrayOfAllHighlights = [];
    const colorCounter = {};
    colorArray.forEach((i) => (colorCounter[i] = 0));

    currentExplanationHighlightedSymbol.forEach((item) => {
        arrayOfAllHighlights.push({
            src: item.src,
            tgt: item.tgt,
            color: item.color,
        });
    });
    currentSearchResultHighlightedSymbol.forEach((item) => {
        arrayOfAllHighlights.push({
            src: item.symbol_id,
            tgt: null,
            srcNode: item.node_id,
            color: item.color,
        });
    });

    const distinctExplanationsColors = arrayOfAllHighlights.reduce(
        (acc, item) => {
            const key = `${item.src}-${item.color}`;
            if (!acc.some((i) => `${i.src}-${i.color}` === key)) {
                acc.push(item);
            }
            return acc;
        },
        []
    );
    distinctExplanationsColors.forEach((item) => {
        colorCounter[item.color] = colorCounter[item.color] + 1;
    });

    let leastOccurences = Infinity;
    let leastOccuringColor = '';
    colorArray.forEach((color) => {
        if (colorCounter[color] < leastOccurences) {
            leastOccurences = colorCounter[color];
            leastOccuringColor = color;
        }
    });
    return leastOccuringColor;
}

export function getNextHoverColor(
    currentExplanationHighlightedSymbol,
    currentSearchResultHighlightedSymbol,
    symbol,
    colorArray
) {
    const searchSymbolSourceIndex = currentExplanationHighlightedSymbol
        .map((item) => item.src)
        .indexOf(symbol);
    if (searchSymbolSourceIndex !== -1) {
        return currentExplanationHighlightedSymbol[searchSymbolSourceIndex]
            .color;
    }
    return getNextColor(
        currentExplanationHighlightedSymbol,
        currentSearchResultHighlightedSymbol,
        colorArray
    );
}
