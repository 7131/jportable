// Controller class
class Controller {
    #animation;
    #parent;
    #sourceArea;
    #svgSource;
    #creator = new AnimCreator();

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
        const createButton = document.getElementById("create");
        const clipboardButton = document.getElementById("clipboard");
        const downloadButton = document.getElementById("download");

        // events
        createButton.addEventListener("click", this.#create.bind(this));
        clipboardButton.addEventListener("click", this.#copy.bind(this));
        downloadButton.addEventListener("click", this.#download.bind(this));

        // get the query string
        const params = new URLSearchParams(window.location.search);
        if (0 < params.size) {
            document.getElementById("pattern").value = params.keys().next().value;
            this.#create(e);
        }
    }

    // create an SVG image
    #create(e) {
        // get the input value
        const text = document.getElementById("pattern").value;
        const message = document.getElementById("message");
        message.textContent = "";
        this.#sourceArea.textContent = "";
        this.#animation.innerHTML = this.#svgSource;

        // create an SVG element
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
        this.#creator.setId(svg.id);
        const motions = [ this.#creator.paths.right, this.#creator.paths.left ].flat();
        motions.forEach(elem => core.defs.appendChild(elem[0]));

        // set the animation
        const table = jmotion.Siteswap.separate(result.throws, result.sync);
        const orbits = this.#creator.calculateOrbits(table, result.sync);
        core.animate(orbits);
        core.setScale(this.#creator.getScale());
        core.setStyle({ "stroke-width": this.#creator.getWidth() });

        // show
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

