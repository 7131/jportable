// Table dealing class
class TableDealer {
    #body;
    #rows;
    #template;
    #head = 1;
    #foot = 0;
    #cols = new Map();

    // constructor
    constructor(body, head) {
        this.#body = body;
        this.#rows = body.rows;
        const number = parseInt(head, 10);
        if (!isNaN(number) && 0 <= number) {
            this.#head = number;
        }
    }

    // get column names
    get colNames() {
        return Array.from(this.#cols.keys());
    }

    // set column names
    set colNames(names) {
        this.#cols.clear();
        if (!Array.isArray(names)) {
            return;
        }
        names.forEach((val, idx) => this.#cols.set(val, idx));
    }

    // get the number of header rows
    get headCount() {
        return this.#head;
    }

    // get the number of data
    get dataCount() {
        return this.#rows.length - this.#head - this.#foot;
    }

    // get the number of footer rows
    get footCount() {
        return this.#foot;
    }

    // create data rows
    createRows(list, formatted) {
        this.removeRows();
        this.#createTemplate(formatted);
        if (Array.isArray(list) && 0 < list.length) {
            list.forEach(this.addData, this);
        }
    }

    // remove data rows and footer rows
    removeRows() {
        while (this.#head < this.#rows.length) {
            this.#body.removeChild(this.#rows[this.#head]);
        }
        this.#foot = 0;
    }

    // add a data row
    addData(data) {
        if (this.#cols.size == 0) {
            return;
        }
        const row = this.#template.cloneNode(true);
        this.#body.insertBefore(row, this.#rows[this.#rows.length - this.#foot]);
        for (const key in data) {
            if (!this.#cols.has(key)) {
                continue;
            }
            let text = data[key];
            if (typeof text != "string" && !(text instanceof String)) {
                text = JSON.stringify(text);
            }
            this.#setCell(row, key, text);
        }
    }

    // add a footer row
    addFoot(name, text) {
        if (this.#cols.size == 0) {
            return;
        }
        const row = this.#template.cloneNode(true);
        this.#body.appendChild(row);
        this.#setCell(row, name, text);
        this.#foot++;
    }

    // set the row numbers
    setRowNumbers(name) {
        if (!this.#cols.has(name)) {
            return;
        }

        // sequential numbers
        for (let i = 0; i < this.dataCount; i++) {
            this.#setCell(this.#rows[this.#head + i], name, i + 1, "symbol");
        }

        // footer
        for (let i = this.dataCount; i < this.#rows.length - this.#head; i++) {
            const text = this.getText(i, name);
            this.#setCell(this.#rows[this.#head + i], name, text, "symbol");
        }
    }

    // fold a column
    foldCol(name, id) {
        for (let i = this.#head; i < this.#rows.length; i++) {
            this.foldCell(i - this.#head, name, id);
        }
    }

    // clear a column
    clearCol(name) {
        if (!this.#cols.has(name)) {
            return;
        }
        const col = this.#cols.get(name);
        for (let i = this.#head; i < this.#rows.length; i++) {
            const row = this.#rows[i];
            this.#setCell(row, name, "");
            row.cells[col].classList.remove("error");
        }
    }

    // get text from the cell
    getText(row, name) {
        if (isNaN(row) || row < 0 || this.#rows.length - this.#head <= row || !this.#cols.has(name)) {
            return "";
        }

        // using innerText instead of textContent to recognize line breaks
        return this.#rows[this.#head + row].cells[this.#cols.get(name)].innerText;
    }

    // set text in the cell
    setText(row, name, text, css) {
        if (isNaN(row) || row < 0 || this.dataCount <= row) {
            return;
        }
        this.#setCell(this.#rows[this.#head + row], name, text, css);
    }

    // set text in the footer cell
    setFoot(name, text, css) {
        if (this.#foot == 0) {
            return;
        }
        this.#setCell(this.#rows[this.#rows.length - 1], name, text, css);
    }

    // fold a cell
    foldCell(row, name, caption) {
        if (isNaN(row) || row < 0 || this.#rows.length - this.#head <= row || !this.#cols.has(name)) {
            return;
        }
        const id = `${caption}_${name}_${row}`;
        const cell = this.#rows[this.#head + row].cells[this.#cols.get(name)];
        let parent = cell.querySelector("pre");
        if (parent == null) {
            parent = cell.querySelector("div");
        }
        if (parent == null) {
            parent = document.createElement("div");
            parent.innerText = cell.innerText;
        }
        parent.classList.add("toggle", "hidden");
        cell.innerHTML = "";

        // checkbox
        const check = document.createElement("input");
        check.setAttribute("type", "checkbox");
        check.setAttribute("id", id);
        check.addEventListener("click", this.#toggleCell.bind(this));
        cell.appendChild(check);

        // label
        const label = document.createElement("label");
        label.setAttribute("for", id);
        label.textContent = "Display";
        cell.appendChild(label);
        cell.appendChild(parent);
    }

    // create a row remplate
    #createTemplate(formatted) {
        if (!Array.isArray(formatted)) {
            formatted = [];
        }
        this.#template = document.createElement("tr");
        for (const name of this.#cols.keys()) {
            const cell = document.createElement("td");
            if (formatted.includes(name)) {
                cell.appendChild(document.createElement("pre"));
            }
            this.#template.appendChild(cell);
        }
    }

    // show or hide the cell
    #toggleCell(e) {
        const check = e.currentTarget;
        const row = Array.from(this.#rows).findIndex(elem => elem == check.parentElement.parentElement);
        if (row < this.#head) {
            return;
        }
        let elements = [];
        if (row < this.#rows.length - this.#foot) {
            // only the target row
            elements.push(check.parentElement.querySelector(".toggle"));
        } else {
            // all rows
            elements = Array.from(this.#body.querySelectorAll("td .toggle"));
            const all = Array.from(this.#body.querySelectorAll("td input[type=checkbox]"));
            all.forEach(elem => elem.checked = check.checked);
        }
        if (check.checked) {
            elements.forEach(elem => elem.classList.remove("hidden"));
        } else {
            elements.forEach(elem => elem.classList.add("hidden"));
        }
    }

    // set the cell
    #setCell(row, name, text, css) {
        if (!this.#cols.has(name)) {
            return;
        }
        const cell = row.cells[this.#cols.get(name)];
        let parent = cell.querySelector("pre");
        if (parent == null) {
            parent = cell.querySelector("div");
        }
        if (parent == null) {
            cell.innerText = text;
        } else {
            parent.innerText = text;
        }
        if (css != null && css != "") {
            cell.classList.add(css);
        }
    }

}

// Test table class
class TestTable extends TableDealer {
    #id;
    #list;
    #method;

    // constructor
    constructor(id, body) {
        super(body);
        this.colNames = [ "number", "params", "expect", "result" ];
        this.#id = id;
        this.progressEvent = null;
        this.completeEvent = null;
        this.replaceEvent = null;
    }

    // create the table
    create(data) {
        if (!Array.isArray(data.list) || data.list.length == 0) {
            return;
        }
        this.#list = data.list;
        super.createRows(data.list, data.formatted);
        super.addFoot("number", "total");
        super.setRowNumbers("number");
        if (Array.isArray(data.folding)) {
            for (const name of data.folding) {
                super.foldCol(name, this.#id);
            }
        }
    }

    // test start
    start(method) {
        if (typeof method == "string" || method instanceof String) {
            method = this.getMethod(method);
        }
        if (typeof method != "function" || !Array.isArray(this.#list) || this.#list.length == 0) {
            return;
        }
        super.clearCol("result");
        this.#method = method;
        setTimeout(this.#test.bind(this), 0, 0, []);
    }

    // get class
    getClass(names, namespace) {
        let cls = namespace;
        for (const name of names) {
            if (cls == null) {
                cls = Function(`return (${name})`)();
            } else {
                cls = cls[name];
            }
        }
        return cls;
    }

    // get method
    getMethod(full, parent) {
        if (typeof full != "string" && !(full instanceof String)) {
            return null;
        }
        const words = full.split(".prototype.");
        if (words.length == 1) {
            // static method
            const names = full.split(".");
            if (names.length == 1) {
                return parent[full];
            }
            const name = names.pop();
            const cls = this.getClass(names, parent);
            return cls[name];
        } else {
            // instance method
            const cls = this.getClass(words[0].split("."), parent);
            const instance = new cls();
            return instance[words[1]].bind(instance);
        }
    }

    // execute test
    #test(index, errors) {
        if (index < this.#list.length) {
            // test row
            if (typeof this.progressEvent == "function") {
                this.progressEvent(index);
            }
            const message = this.#executeRow(this.#list[index]);
            if (message == "") {
                super.setText(index, "result", "OK");
            } else {
                super.setText(index, "result", message, "error");
                errors.push(index + 1);
            }
            setTimeout(this.#test.bind(this), 0, index + 1, errors);
        } else {
            // result row
            if (errors.length == 0) {
                super.setFoot("result", "All OK");
            } else {
                super.setFoot("result", `NG: ${errors.join()}`, "error");
            }
            if (typeof this.completeEvent == "function") {
                this.completeEvent();
            }
        }
    }

    // execute by row
    #executeRow(data) {
        let actual;
        if (Array.isArray(data.params)) {
            actual = this.#method(...data.params);
        } else {
            actual = this.#method(data.params);
        }
        const result = JSON.stringify(actual, this.replaceEvent);
        if (result == JSON.stringify(data.expect)) {
            return "";
        }
        if (typeof actual == "string" || actual instanceof String) {
            return actual;
        } else {
            return result;
        }
    }

}
