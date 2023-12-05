// Controller class
const Controller = function() {
    window.addEventListener("load", this._initialize.bind(this), false);
}

// Controller prototype
Controller.prototype = {

    // initialize the page
    "_initialize": function(e) {
        this._creator = new AnimCreator();

        // elements
        this._animation = document.getElementById("animation");
        this._svg = this._animation.innerHTML;
        this._sourceArea = document.getElementById("source");
        const createButton = document.getElementById("create");
        const clipboardButton = document.getElementById("clipboard");
        const downloadButton = document.getElementById("download");

        // events
        createButton.addEventListener("click", this._create.bind(this), false);
        clipboardButton.addEventListener("click", this._copy.bind(this), false);
        downloadButton.addEventListener("click", this._download.bind(this), false);

        // get the query string
        const params = new URLSearchParams(window.location.search);
        if (0 < params.size) {
            document.getElementById("pattern").value = params.keys().next().value;
            this._create(e);
        }
    },

    // create an SVG images
    "_create": function(e) {
        // get the input value
        const message = document.getElementById("message");
        message.innerHTML = "";
        this._animation.innerHTML = this._svg;
        this._sourceArea.innerHTML = "";
        const text = document.getElementById("pattern").value;
        if (!text) {
            // pattern is not specified
            message.innerHTML = "No data for animation.";
            return;
        }

        // analyze
        const result = jmotion.Siteswap.analyze(text);
        if (!result.valid) {
            message.innerHTML = result.message;
            return;
        }

        // set the animation
        const table = jmotion.Siteswap.separate(result.throws, result.synch);
        const chain = this._creator.calculateChain(table, result.synch);
        this._core = new SvgCore(this._createSvg(result.text));
        this._core.animate(chain);

        // show
        this._animation.innerHTML = "";
        this._animation.appendChild(this._core.svg);
        const xml = this._core.svg.outerHTML.replace(/<\/\w+>/g, "$&\n").replace(/><([^\/])/g, ">\n<$1");
        this._sourceArea.appendChild(document.createTextNode(xml));
    },

    // copy to clipboard
    "_copy": function(e) {
        window.navigator.clipboard.writeText(this._sourceArea.textContent);
    },

    // download as file
    "_download": function(e) {
        if (!this._core) {
            // no source code
            return;
        }

        // get the blob string.
        const blob = new Blob([ this._sourceArea.innerText ], { "type": "text/plain" });
        const url = URL.createObjectURL(blob);

        // link for download
        const link = document.createElement("a");
        link.href = url;
        link.download = `${this._core.svg.id}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    },

    // create an SVG element
    "_createSvg": function(pattern) {
        const namespace = "http://www.w3.org/2000/svg";
        const element = document.createElementNS(namespace, "svg");
        element.id = `pattern_${pattern}`;
        element.setAttribute("xmlns", namespace);
        return element;
    },

}

// start the controller
new Controller();

