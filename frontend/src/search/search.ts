import './search.css'
import {backendURL, make_atoms_string, make_rules_string} from "../util";
import {Filter, Model, Signature, Transformation} from "../types";
import {redrawGraph, toggleRow} from "../graph/graph";
import {drawEdges} from "../graph/edges";
import {showFilterPill} from "../filter/filter";

var currentFocus = -1;

function clearActives(options: HTMLCollectionOf<Element>) {
    Array.from(options).map(opt => opt.classList.remove("active"))
}

function updateSelection(options: HTMLCollectionOf<Element>) {
    console.log(`Updating ${options.length} options ${currentFocus}`)

    if (!options) return false;
    clearActives(options)
    if (currentFocus >= options.length) currentFocus = 0
    if (currentFocus < 0) currentFocus = (options.length - 1)
    options[currentFocus].classList.add("active")
}

function hoverOverThing(at: number): void {
    currentFocus = at;

    var options = document.getElementsByClassName("search_row")
    updateSelection(options);
}

function clearFilter(): void {
    document.getElementById("q").nodeValue = ""
    Array.from(document.getElementsByClassName("search_row")).map(e => e.remove())
}


function inverseToggleRow(row_id: string) {
    Array.from(document.getElementsByClassName("row_container")).filter(e => e.id != row_id).forEach(e => toggleRow(e.id))
}

function setFilter(on: Model | Transformation | Signature): void {
    clearFilter()
    const fltr = {"on": on, "_type": "Filter"}
    if (on._type == "Transformation") {
        const transformation = on as Transformation
        inverseToggleRow(`row_${transformation.id}`)
        drawEdges();
    } else if (on._type == "Node") {
        fetch(`${backendURL("filter")}`, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fltr)
        }).then(redrawGraph).catch(e => console.error(e))
    } else if (on._type == "Signature") {
        fetch(`${backendURL("filter")}`, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fltr)
        }).then(redrawGraph).catch(e => console.error(e))
    } else {
        throw TypeError("Unknown type to set filter: " + on._type);
    }
    showFilterPill(fltr)
}

function makeModelRow(model: Model, index: number): HTMLElement {
    let row = document.createElement("li")
    row.classList.add("search_row", "search_set")
    row.id = `result_${model._type}_${model.uuid}`
    row.onmouseover = () => hoverOverThing(index)
    row.onclick = () => setFilter(model)
    row.innerHTML = make_atoms_string(model.atoms);
    return row;

}

function makeTransformationRow(transformation: Transformation, index: number): HTMLElement {
    let row = document.createElement("li")
    row.classList.add("search_row", "search_rule")
    row.id = `result_${transformation._type}_${transformation.id}`
    row.onmouseover = () => hoverOverThing(index)
    row.onclick = () => setFilter(transformation)
    row.innerHTML = make_rules_string(transformation.rules);
    return row;

}

function makeSignatureRow(signature: Signature, index: number): HTMLLIElement {
    let row = document.createElement("li")
    row.classList.add("search_row", "search_signature")
    row.onmouseover = () => hoverOverThing(index)
    row.onclick = () => setFilter(signature)
    row.innerHTML = `${signature.name}/${signature.args}`
    return row
}

function make_suggestion_row(data: Array<Model | Transformation | Signature>, i: number) {
    if (data[i]._type == "Node") {
        return makeModelRow(data[i] as Model, i);
    } else if (data[i]._type == "Transformation") {
        return makeTransformationRow(data[i] as Transformation, i);
    } else if (data[i]._type == "Signature") {
        return makeSignatureRow(data[i] as Signature, i);
    } else {
        console.error(`Unsupported type ${data[i]._type}`)
    }
}

function showResults() {


/// STOLEN FROM https://www.algolia.com/blog/engineering/how-to-implement-autocomplete-with-javascript-on-your-website/
    let val = document.getElementById("q") as HTMLInputElement;
    const res = document.getElementById("search_result");

    const query = val.value
    res.innerHTML = '';

    if (query == '') {
        return;
    }

    console.log(`Showing results for query=${query}`)
    let resultList = document.createElement("ul")
    resultList.classList.add("search_result_list")
    fetch(`${backendURL("query")}?q=` + query).then(
        function (response) {
            return response.json();
        }).then(function (data: Array<Model | Transformation | Signature>) {
        for (let i = 0; i < data.length; i++) {
            resultList.appendChild(make_suggestion_row(data, i));
        }
        res.appendChild(resultList);
        console.log(`Displaying ${resultList}`)
        return true;
    }).catch(function (err) {
        console.warn('Something went wrong.', err);
        return false;
    });
}


async function handleKeyPress(event: KeyboardEvent) {
    var options = document.getElementsByClassName("search_row")
    if (event.key === "ArrowUp") {
        currentFocus--;
        updateSelection(options)
    } else if (event.key == "ArrowDown") {
        currentFocus++;
        updateSelection(options)
    } else if (event.key == "Enter") {
        event.preventDefault();
        if (currentFocus > -1) {
            if (options) {
                const toBeClicked = options[currentFocus] as HTMLElement;
                toBeClicked.click();
            }
        }
    } else {
        showResults();
    }
}

export function initializeSearchBar(): void {
    let searchBar = document.getElementById("q")
    let form = document.getElementsByTagName("form")[0];

    form.onsubmit = async function (event) {
        event.preventDefault();
    }
    console.log(
        `Adding event listener to ${searchBar}`
    )
    searchBar.onkeyup = function (event) {
        handleKeyPress(event)
    }
    console.log("Initialized Searchbar.")
}