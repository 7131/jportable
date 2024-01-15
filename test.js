// Column number constants
const ColNum = {
    "NUMBER": 0,
    "TARGET": 1,
    "EXPECT": 2,
    "RESULT": 3,
}

// Controller class
const Controller = function() {
    window.addEventListener("load", this._initialize.bind(this), false);
}

// Controller prototype
Controller.prototype = {

    // initialize the page
    "_initialize": function(e) {
        // fields
        this._creator = new AnimCreator();
        this._svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this._svg.setAttribute("xmlns", this._svg.namespaceURI);

        // row data
        this._rows = document.getElementById("patterns").rows;
        this._setRowData(this._rows);

        // button
        const execute = document.getElementById("execute");
        execute.addEventListener("click", this._start.bind(this), false);
    },

    // set row data
    "_setRowData": function(rows) {
        if (rows.length <= 1) {
            // header only
            return;
        }
        for (let i = 1; i < rows.length; i++) {
            // row number
            const number = rows[i].cells[ColNum.NUMBER];
            number.innerText = i;
            number.classList.add("symbol");

            // expected value
            const expect = rows[i].cells[ColNum.EXPECT];
            if (0 < expect.childNodes.length) {
                const div = expect.getElementsByTagName("div");
                let node;
                if (div.length == 0) {
                    node = expect;
                } else {
                    node = div[0];
                }
                while (node && !(node instanceof Text)) {
                    node = node.firstChild;
                }

                // the string was split if it was long
                let text = "";
                while (node instanceof Text && node.textContent != "") {
                    text += node.textContent;
                    node = node.nextSibling;
                }
                this._setExpected(`view_${i}`, expect, text.trim());
            }
        }

        // the last row
        const last = rows[rows.length - 1];
        const total = last.parentNode.appendChild(last.cloneNode(true));
        total.cells[ColNum.NUMBER].innerText = "total";
        total.cells[ColNum.TARGET].innerText = "";
        total.cells[ColNum.EXPECT].innerText = "";
        total.cells[ColNum.RESULT].innerText = "";
        this._setExpected("view_total", total.cells[ColNum.EXPECT], "");
    },

    // set expected value column
    "_setExpected": function(id, cell, text) {
        // remove existing elements
        while (cell.lastChild) {
            cell.removeChild(cell.lastChild);
        }
        cell.dataset.expected = text;

        // checkbox
        const check = document.createElement("input");
        check.setAttribute("type", "checkbox");
        check.setAttribute("id", id);
        check.addEventListener("click", this._toggleExpected.bind(this), false);
        cell.appendChild(check);

        // label
        const label = document.createElement("label");
        label.setAttribute("for", id);
        label.textContent = "Display";
        cell.appendChild(label);

        // string
        const div = document.createElement("div");
        div.classList.add("hidden");
        div.textContent = text;
        cell.appendChild(div);
    },

    // show or hide the expected column
    "_toggleExpected": function(e) {
        const check = e.currentTarget;
        const divs = [];
        if (check.id == "view_total") {
            // total row
            for (let i = 1; i < this._rows.length; i++) {
                const cell = this._rows[i].cells[ColNum.EXPECT];
                if (cell.firstChild) {
                    cell.firstChild.checked = check.checked;
                    divs.push(cell.lastChild);
                }
            }
        } else {
            // test row
            divs.push(check.parentElement.lastChild);
        }
        if (check.checked) {
            // show
            divs.forEach(elem => elem.classList.remove("hidden"));
        } else {
            // hide
            divs.forEach(elem => elem.classList.add("hidden"));
        }
    },

    // start the test
    "_start": function(e) {
        e.currentTarget.disabled = true;

        // initialize the table
        for (let i = 1; i < this._rows.length; i++) {
            const result = this._rows[i].cells[ColNum.RESULT];
            result.innerText = "";
            result.classList.remove("error");
        }

        // start
        const errors = [];
        for (let i = 1; i < this._rows.length; i++) {
            const message = this._execute(this._rows[i]);
            const result = this._rows[i].cells[ColNum.RESULT];
            if (message == "") {
                result.innerText = "OK";
            } else {
                result.innerText = message;
                result.classList.add("error");
                errors.push(i);
            }
        }

        // finished
        const last = this._rows[this._rows.length - 1].cells[ColNum.RESULT];
        if (errors.length == 0) {
            last.innerText = "All OK";
        } else {
            last.innerText = `NG : ${errors.join()}`;
            last.classList.add("error");
        }
        e.currentTarget.disabled = false;
    },

    // execute by row
    "_execute": function(row) {
        // get arguments and expected value
        const target = row.cells[ColNum.TARGET].innerText;
        const expect = row.cells[ColNum.EXPECT].dataset.expected;
        if (target == "" && !expect) {
            return "";
        }

        // SVG initialization
        const escape = encodeURIComponent(target).replace(/%/g, ":");
        const text = escape.replace(/[!~*'\(\)]/g, this._replacer);
        this._svg.id = `test_${text}`;
        this._svg.innerHTML = "";
        const core = new SvgCore(this._svg);
        this._creator.setId(this._svg.id);
        const motions = [ this._creator.paths.right, this._creator.paths.left ].flat();
        motions.forEach(elem => core.defs.appendChild(elem[0]));

        // execute
        const result = jmotion.Siteswap.analyze(target);
        const table = jmotion.Siteswap.separate(result.throws, result.synch);
        const orbits = this._creator.calculateOrbits(table, result.synch);

        // set to SVG
        core.animate(orbits);
        core.setScale(this._creator.getScale());
        core.setStyle({ "stroke-width": this._creator.getWidth() });
        const actual = this._svg.outerHTML;
        if (actual == expect) {
            return "";
        } else {
            return actual;
        }
    },

    // replace symbols with character codes
    "_replacer": function(match) {
        let hex = match.charCodeAt(0).toString(16);
        if (hex.length % 2 == 1) {
            hex = `0${hex}`;
        }
        return `:${hex}`;
    },

}

// start the controller
new Controller();

