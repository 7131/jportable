// Controller class
class Controller {
    #animation;
    #parent;
    #sourceArea;
    #svgSource;
    #generator = new AnimGenerator();

    // constructor
    constructor() {
        window.addEventListener("load", this.#initialize.bind(this));
    }

    // initialize the page
    #initialize(e) {
        // elements
        this.#animation = document.getElementById("animation");
        this.#svgSource = this.#animation.innerHTML;
        this.#parent = document.createElement("div");
        this.#sourceArea = document.getElementById("source");
        const generateButton = document.getElementById("generate");
        const clipboardButton = document.getElementById("clipboard");
        const downloadButton = document.getElementById("download");

        // events
        generateButton.addEventListener("click", this.#generate.bind(this));
        clipboardButton.addEventListener("click", this.#copy.bind(this));
        downloadButton.addEventListener("click", this.#download.bind(this));

        // get the query string
        const params = new URLSearchParams(window.location.search);
        if (0 < params.size) {
            document.getElementById("pattern").value = params.keys().next().value;
            this.#generate(e);
        }
    }

    // generate an SVG image
    #generate(e) {
        // get the input value
        const text = document.getElementById("pattern").value;
        const message = document.getElementById("message");
        message.textContent = "";
        this.#sourceArea.textContent = "";
        this.#animation.innerHTML = this.#svgSource;

        // since animations start as soon as they are added to the DOM, they must be created outside the DOM
        this.#parent.innerHTML = this.#svgSource;
        const svg = this.#parent.querySelector("svg");
        if (!svg || !text) {
            message.textContent = "No data for animation.";
            return;
        }

        // analyze
        const result = jmotion.Siteswap.analyze(text);
        if (!result.valid) {
            message.textContent = result.message;
            return;
        }

        // set to SVG
        svg.id = `pattern_${result.text}`;
        svg.setAttribute("xmlns", svg.namespaceURI);
        const core = new SvgCore(svg);
        this.#generator.setId(svg.id);
        const motions = [ this.#generator.paths.right, this.#generator.paths.left ].flat();
        motions.forEach(elem => core.defs.appendChild(elem[0]));

        // set the animation
        const table = jmotion.Siteswap.separate(result.throws, result.sync);
        const orbits = this.#generator.calculateOrbits(table, result.sync, result.throws);
        core.animate(orbits);
        core.scale = this.#generator.scale;
        core.setStyle({ "stroke-width": this.#generator.width });

        // add to the DOM
        this.#animation.innerHTML = this.#parent.innerHTML;
        const xml = this.#parent.innerHTML.trim().replace(/>\s+/g, ">");
        const arrange = xml.replace(/<\/\w+>/g, "$&\n").replace(/><([^\/])/g, ">\n<$1");
        this.#sourceArea.appendChild(document.createTextNode(arrange));
    }

    // copy to clipboard
    #copy(e) {
        window.navigator.clipboard.writeText(this.#sourceArea.textContent);
    }

    // download as file
    #download(e) {
        if (this.#sourceArea.textContent.trim() == "") {
            return;
        }

        // get the blob string.
        const blob = new Blob([ this.#sourceArea.textContent ], { "type": "text/plain" });
        const url = URL.createObjectURL(blob);

        // link for download
        const link = document.createElement("a");
        link.href = url;
        link.download = `${this.#animation.firstElementChild.id}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    }

}

// start the controller
new Controller();

