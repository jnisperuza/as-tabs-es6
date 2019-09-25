const KEYCODE = {
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39,
    UP: 38,
    HOME: 36,
    END: 35,
};
const template = document.createElement('template');
template.innerHTML = `
    <style>
        :host {
            display: flex;
            flex-wrap: wrap;
        }
        ::slotted(as-tab-panel) {
            flex-basis: 100%;
        }
    </style>
    <slot name="tab"></slot>
    <slot name="panel"></slot>
`;

// ShadyCSS will rename classes as needed to ensure style scoping.
ShadyCSS.prepareTemplate(template, 'as-tabs');

class AsTabs extends HTMLElement {

    constructor() {
        super();

        this._onSlotChange = this._onSlotChange.bind(this);
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this._tabSlot = this.shadowRoot.querySelector('slot[name=tab]');
        this._panelSlot = this.shadowRoot.querySelector('slot[name=panel]');

        this._tabSlot.addEventListener('slotchange', this._onSlotChange);
        this._panelSlot.addEventListener('slotchange', this._onSlotChange);
    }

    connectedCallback() {
        // will need access to its parent node.
        ShadyCSS.styleElement(this);

        this.addEventListener('keydown', this._onKeyDown);
        this.addEventListener('click', this._onClick);

        if (!this.hasAttribute('role')) {
            this.setAttribute('role', 'tablist');
        }

        Promise.all([
            customElements.whenDefined('as-tab'),
            customElements.whenDefined('as-tab-panel'),
        ]).then(_ => this._linkPanels());
    }

    disconnectedCallback() {
        this.removeEventListener('keydown', this._onKeyDown);
        this.removeEventListener('click', this._onClick);
    }

    // Private methods
    _onSlotChange() {
        this._linkPanels();
    }

    _linkPanels() {
        const tabs = this._allTabs();
        tabs.forEach(tab => {
            const panel = tab.nextElementSibling;
            if (panel.tagName.toLowerCase() !== 'as-tab-panel') {
                console.error(`Tab #${tab.id} is not a` +
                    `sibling of a <howto-panel>`);
                return;
            }

            tab.setAttribute('aria-controls', panel.id);
            panel.setAttribute('aria-labelledby', tab.id);
        });

        const selectedTab = tabs.find(tab => tab.selected) || tabs[0];
        this._selectTab(selectedTab);
    }

    _allTabs() {
        return Array.from(this.querySelectorAll('as-tab'));
    }

    _allPanels() {
        return Array.from(this.querySelectorAll('as-tab-panel'));
    }

    _panelForTab(tab) {
        const panelId = tab.getAttribute('aria-controls');
        return this.querySelector(`#${panelId}`);
    }

    _prevTab() {
        const tabs = this._allTabs();
        let newIdx = tabs.findIndex(tab => tab.selected) - 1;
        return tabs[(newIdx + tabs.length) % tabs.length];
    }

    _firstTab() {
        const tabs = this._allTabs();
        return tabs[0];
    }

    _nextTab() {
        const tabs = this._allTabs();
        let newIdx = tabs.findIndex(tab => tab.selected) + 1;
        return tabs[newIdx % tabs.length];
    }

    _selectTab(newTab) {
        this._reset();

        const newPanel = this._panelForTab(newTab);
        if (!newPanel) {
            throw new Error(`No panel with id ${newPanelId}`);
        }
        newTab.selected = true;
        newPanel.hidden = false;
        newTab.focus();
    }

    _reset() {
        const tabs = this._allTabs();
        const panels = this._allPanels();

        tabs.forEach(tab => tab.selected = false);
        panels.forEach(panel => panel.hidden = true);
    }

    _onKeyDown(event) {
        if (event.target.getAttribute('role') !== 'tab')
            return;

        if (event.altKey)
            return;

        let newTab;
        switch (event.keyCode) {
            case KEYCODE.LEFT:
            case KEYCODE.UP:
                newTab = this._prevTab();
                break;

            case KEYCODE.RIGHT:
            case KEYCODE.DOWN:
                newTab = this._nextTab();
                break;

            case KEYCODE.HOME:
                newTab = this._firstTab();
                break;

            case KEYCODE.END:
                newTab = this._lastTab();
                break;
            // Any other key press is ignored and passed back to the browser.
            default:
                return;
        }

        event.preventDefault();
        this._selectTab(newTab);
    }

    _onClick(event) {
        if (event.target.getAttribute('role') !== 'tab') {
            return;
        }
        this._selectTab(event.target);
    }
}
customElements.define('as-tabs', AsTabs);


// Tab child component
let AsTabCounter = 0;
class AsTab extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {
        this.setAttribute('role', 'tab');

        if (!this.id) {
            this.id = `howto-tab-generated-${AsTabCounter++}`;
        }

        this.setAttribute('aria-selected', 'false');
        this.setAttribute('tabindex', -1);
        this._upgradeProperty('selected');
    }

    attributeChangedCallback() {
        const value = this.hasAttribute('selected');
        this.setAttribute('aria-selected', value);
        this.setAttribute('tabindex', value ? 0 : -1);
    }

    // Private methods
    _upgradeProperty(prop) {
        if (this.hasOwnProperty(prop)) {
            let value = this[prop];
            delete this[prop];
            this[prop] = value;
        }
    }

    // Read for browser
    set selected(value) {
        value = Boolean(value);
        if (value)
            this.setAttribute('selected', '');
        else
            this.removeAttribute('selected');
    }

    get selected() {
        return this.hasAttribute('selected');
    }
}
customElements.define('as-tab', AsTab);

// Tab panel child component
let AsPanelCounter = 0;
class AsTabPanel extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.setAttribute('role', 'tabpanel');
        if (!this.id) {
            this.id = `as-tab-panel-generated-${AsPanelCounter++}`;
        }
    }
}
customElements.define('as-tab-panel', AsTabPanel);

