// Animation plane chain class
class PlaneChain {
    #planes = [];
    #loop = 0;

    // start the loop
    startLoop() {
        this.#loop = this.#planes.length;
    }

    // get the list of animation planes
    getPlanes(type) {
        if (type == null) {
            return this.#planes;
        }
        return this.#planes.filter(elem => elem instanceof type);
    }

    // add an animation plane
    addPlane(value) {
        this.#planes.push(value);
    }

    // add a halt plane
    addHaltPlane(during, point) {
        if (this.#loop < this.#planes.length) {
            const before = this.#planes[this.#planes.length - 1];
            if (before instanceof HaltPlane) {
                return before.addDuring(during);
            }
        }
        const plane = new HaltPlane().setDuring(during).setTo(point);
        this.#planes.push(plane);
        return plane;
    }

    // add a motion plane
    addMotionPlane(id, during, points) {
        const plane = new MotionPlane().setReferenceId(id).setDuring(during);
        if (Array.isArray(points)) {
            plane.setPoints(points);
        }
        this.#planes.push(plane);
        return plane;
    }

    // set the ID
    setId(value) {
        for (let i = 0; i < this.#planes.length; i++) {
            this.#planes[i].setId(value, i);
        }
        return this;
    }

    // set the chain
    setChain(begin) {
        const last = this.#planes.length - 1;
        if (last < 0) {
            return this;
        }
        this.#planes[0].addBegin(begin);

        // set the order from the top
        for (let i = 0; i < last; i++) {
            this.#planes[i + 1].addBegin(this.#planes[i]);
        }

        // repeat
        this.#planes[this.#loop].addBegin(this.#planes[last]);
        return this;
    }

    // create SVG elements
    createElements() {
        return this.#planes.map(elem => elem.createElements()).flat();
    }

}

// Animation part base class
class PartBase {
    #name;
    #id = "";
    #attribute = "";
    #begins = [];
    #during = 0;

    // constructor
    constructor(name) {
        this.#name = name || "animate";
    }

    // get the ID
    getId() {
        return this.#id;
    }

    // set the ID
    setId(value, postfix) {
        if (postfix == null || postfix === "") {
            this.#id = value;
        } else {
            this.#id = `${value}_${postfix}`;
        }
        return this;
    }

    // get the list of start timings
    getBegins() {
        return this.#begins;
    }

    // set the list of start timings
    setBegins(values) {
        this.#begins = [];
        if (!Array.isArray(values)) {
            return this;
        }
        this.#begins = values;
        return this;
    }

    // add the start timing
    addBegin(value) {
        if (this.#begins.indexOf(value) < 0) {
            this.#begins.push(value);
        }
        return this;
    }

    // get the duration time (ms)
    getDuring() {
        return this.#during;
    }

    // set the duration time (ms)
    setDuring(value) {
        let number = parseFloat(value);
        if (isNaN(number) || number < 0) {
            number = 0;
        }
        this.#during = number;
        return this;
    }

    // set the attribute name
    setAttribute(value) {
        this.#attribute = value;
        return this;
    }

    // create SVG elements
    createElements() {
        // start timing
        const begins = [];
        for (const element of this.#begins) {
            const number = parseFloat(element);
            if (isNaN(number)) {
                if (typeof element.getId == "function") {
                    begins.push(`${element.getId()}.end`);
                } else {
                    begins.push(element);
                }
            } else {
                begins.push(this.#getTime(number));
            }
        }

        // create an animation element
        const element = document.createElementNS("http://www.w3.org/2000/svg", this.#name);
        if (this.#id) {
            element.setAttribute("id", this.#id);
        }
        if (this.#attribute) {
            element.setAttribute("attributeName", this.#attribute);
        }
        element.setAttribute("begin", begins.join(";"));
        element.setAttribute("dur", this.#getTime(this.#during));
        return element;
    }

    // get a time string
    #getTime(value) {
        return `${value}ms`;
    }

}

// Halt part class
class HaltPart extends PartBase {
    #to = 0;

    // constructor
    constructor() {
        super("set");
    }

    // set the value
    setTo(value) {
        let number = parseFloat(value);
        if (isNaN(number)) {
            number = 0;
        }
        this.#to = number;
        return this;
    }

    // add the duration time (ms)
    addDuring(value) {
        let number = parseFloat(value);
        if (isNaN(number) || number < 0) {
            number = 0;
        }
        super.setDuring(super.getDuring() + number);
        return this;
    }

    // create SVG elements
    createElements() {
        const element = super.createElements();
        element.setAttribute("to", this.#to);
        return element;
    }

}

// Value part class
class ValuePart extends PartBase {
    #values = [];

    // get the list of values
    getValues() {
        return this.#values;
    }

    // set the list of values
    setValues(values) {
        this.#values = [];
        if (!Array.isArray(values)) {
            return this;
        }
        this.#values = values.map(parseFloat).filter(elem => !isNaN(elem));
        return this;
    }

    // create SVG elements
    createElements() {
        const element = super.createElements();
        element.setAttribute("values", this.#values.join(";"));
        return element;
    }

}

// Parabolic part class
class ParabolicPart extends ValuePart {

    // create SVG elements
    createElements() {
        const element = super.createElements();
        element.setAttribute("calcMode", "spline");
        element.setAttribute("keyTimes", "0;0.5;1");
        element.setAttribute("keySplines", "0.33,0.67 0.67,1;0.33,0 0.67,0.33");
        return element;
    }

}

// Animation plane base class
class PlaneBase {
    #x;
    #y;

    // constructor
    constructor(x, y) {
        this.#x = x;
        this.#y = y;
    }

    // get the x-coordinate
    getX() {
        return this.#x;
    }

    // get the y-coordinate
    getY() {
        return this.#y;
    }

    // get the ID
    getId() {
        return this.#x.getId();
    }

    // set the ID
    setId(value, postfix) {
        this.#x.setId(value, postfix);
        return this;
    }

    // set the attribute names
    setAttribute(x, y) {
        this.#x.setAttribute(x);
        this.#y.setAttribute(y);
        return this;
    }

    // add the start timing
    addBegin(value) {
        this.#x.addBegin(value);
        this.#y.addBegin(value);
        return this;
    }

    // set the duration time (ms)
    setDuring(value) {
        this.#x.setDuring(value);
        this.#y.setDuring(value);
        return this;
    }

    // create SVG elements
    createElements() {
        return [ this.#x.createElements(), this.#y.createElements() ].flat();
    }

}

// Halt plane class
class HaltPlane extends PlaneBase {

    // constructor
    constructor() {
        super(new HaltPart(), new HaltPart());
        super.setAttribute("x", "y");
    }

    // set the value
    setTo(value) {
        super.getX().setTo(value.x);
        super.getY().setTo(value.y);
        return this;
    }

    // add the duration time (ms)
    addDuring(value) {
        super.getX().addDuring(value);
        super.getY().addDuring(value);
        return this;
    }

}

// Numeric plane class
class NumericPlane extends PlaneBase {

    // constructor
    constructor(x, y) {
        super(x || new ValuePart(), y || new ValuePart());
    }

    // set the list of values
    setValues(xs, ys) {
        super.getX().setValues(xs);
        super.getY().setValues(ys);
        return this;
    }

}

// Parabolic plane class
class ParabolicPlane extends NumericPlane {

    // constructor
    constructor() {
        super(new ValuePart(), new ParabolicPart());
        super.setAttribute("x", "y");
    }

}

// Motion plane class
class MotionPlane extends PartBase {
    #href = "";
    #points = [];

    // constructor
    constructor() {
        super("animateMotion");
    }

    // set the reference ID
    setReferenceId(value) {
        this.#href = value;
        return this;
    }

    // set the portion to be used
    setPoints(values) {
        this.#points = values;
        return this;
    }

    // create SVG elements
    createElements() {
        const element = super.createElements();
        const count = this.#points.length - 1;
        if (0 < count) {
            // if the part to be used is specified
            const times = new Array(count + 1).fill().map((val, idx) => idx / count);
            element.setAttribute("keyTimes", times.join(";"));
            element.setAttribute("keyPoints", this.#points.join(";"));
        }
        const mpath = document.createElementNS(element.namespaseURI, "mpath");
        mpath.setAttribute("href", `#${this.#href}`);
        element.appendChild(mpath);
        return element;
    }

}

// Transform plane class
class TransformPlane extends PartBase {
    #type = "rotate";
    #from = 0;
    #to = 0;

    // constructor
    constructor() {
        super("animateTransform");
        super.setAttribute("transform");
    }

    // set the value
    setTo(value) {
        let number = parseFloat(value);
        if (isNaN(number)) {
            number = 0;
        }
        this.#to = number;
        return this;
    }

    // create SVG elements
    createElements() {
        const element = super.createElements();
        element.setAttribute("type", this.#type);
        element.setAttribute("from", this.#from);
        element.setAttribute("to", this.#to);
        return element;
    }

}

