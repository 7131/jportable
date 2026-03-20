// Controller class
class Controller {
    #test;
    #creator = new AnimCreator();
    #svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    // constructor
    constructor() {
        window.addEventListener("load", this.#initialize.bind(this));
    }

    // initialize the page
    #initialize(e) {
        this.#svg.setAttribute("xmlns", this.#svg.namespaceURI);
        const main = document.getElementById("test");
        const table = main.querySelector("table");
        if (table == null || table.tBodies.length == 0) {
            return;
        }
        const button = main.querySelector("button");

        // test settings
        this.#test = new TestTable(main.id, table.tBodies[0]);
        this.#test.create(TestData);
        this.#test.completeEvent = () => button.disabled = false;
        button.addEventListener("click", this.#start.bind(this));
    }

    // start all tests
    #start(e) {
        const button = e.currentTarget;
        button.disabled = true;
        this.#test.start(this.#execute.bind(this));
    }

    // execute a test
    #execute(text) {
        this.#svg.id = `test_${text}`;
        this.#svg.textContent = "";

        // preparation for animation
        const core = new SvgCore(this.#svg);
        this.#creator.setId(this.#svg.id);
        const motions = [ this.#creator.paths.right, this.#creator.paths.left ].flat();
        motions.forEach(elem => core.defs.appendChild(elem[0]));

        // execute
        const result = jmotion.Siteswap.analyze(text);
        const table = jmotion.Siteswap.separate(result.throws, result.sync);
        const orbits = this.#creator.calculateOrbits(table, result.sync);

        // set to SVG
        core.animate(orbits);
        core.setScale(this.#creator.getScale());
        core.setStyle({ "stroke-width": this.#creator.getWidth() });
        return this.#svg.outerHTML;
    }

}

// start the controller
new Controller();

