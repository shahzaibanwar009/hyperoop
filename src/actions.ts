
import * as proxperty from "./proxperty";
import * as render from "./render";

import Hist from "redoundo";

/** Interface of a parental `Actions` */
export interface IActionsParent {
    /** renderer that should be called for page re-rendering */
    readonly Renderer: render.IRenderer;
    /** `redoundo.Hist` object for redo/undo functionality */
    readonly History: Hist;
}

/** Class of hyperoop top-level action */
export class Actions<S extends {}> {
    /** state object */
    get State(): S { return this.state; }
    /** state object that remember previous states and has redo/undo functionality */
    get Remember(): S { return this.remember; }
    /** renderer that should be called for page re-rendering */
    get Renderer(): render.IRenderer { return this.renderer; }

    /** `redoundo.Hist` object implements redo/undo functionality */
    public readonly History: Hist;

    private orig:     S;
    private state:    S;
    private remember: S;
    private renderer: render.IRenderer;

    /** Construct an `Actions` object
     *
     * @param start state on start
     * @param hist `redoundo.Hist` object implements redo/undo functionality
     */
    constructor(start: S, hist: number | Hist = null) {
        this.orig     = start;
        this.History   = typeof hist === "number" ? new Hist(hist) : hist;
        this.init({scheduleRender: () => null});
    }

    /** Partially sets a new state
     *
     * @param s new state data
     * @param remember remember previous state using `redoundo.Hist` or not?
     */
    public set(s: Partial<S>, remember: boolean = false) {
        let keys: Array<string|number>;
        if (Array.isArray(s)) {
            keys = Array.from(s.keys());
        } else {
            keys = Object.getOwnPropertyNames(s);
        }
        keys = keys.filter((k) => !(k in this.orig) || this.orig[k] !== s[k]);
        const change = keys.length > 0;
        if (!change) { return; }
        const self = this;
        if (remember && this.History) {
            const was: Partial<S> = {};
            const wasnt: Array<string|number> = [];
            for (const k of keys) {
                if (k in this.orig) {
                    was[k] = this.orig[k];
                } else { wasnt.push(k); }
            }
            this.History.add({
                Redo: () => {
                    for (const k of keys) { self.orig[k] = s[k]; }
                    self.renderer.scheduleRender();
                },
                Undo: () => {
                    for (const k in was) { self.orig[k] = was[k]; }
                    for (const k of wasnt) { delete self.orig[k]; }
                    self.renderer.scheduleRender();
                },
            });
        } else {
            for (const k of keys) { this.orig[k] = s[k]; }
            this.renderer.scheduleRender();
        }
    }

    /** Initialize `Actions` with new renderer
     *
     * @param r
     */
    public init(r: render.IRenderer) {
        this.renderer = r;
        const self    = this;
        this.state    = proxperty.make(this.orig, () => self.renderer.scheduleRender());
        this.remember = proxperty.makeH(this.orig, () => self.renderer.scheduleRender(), this.History);
    }
}

/** Class of hyperoop sub-actions */
export class SubActions<S extends {}> extends Actions<S> {

    /** Constructs `SubActions` object inheriting `History` and `Renderer` from a parent.
     *  NOTE! If `SubActions` object created before first rendering then you will need
     *  to call it's `init` manually.
     *
     * @param start state on start
     * @param parent parent `(Sub)Actions` object.
     */
    constructor(start: S, parent: IActionsParent) {
        super(start, parent.History);
        if (parent.Renderer) {
            this.init({scheduleRender: () => parent.Renderer.scheduleRender()});
        }
    }
}