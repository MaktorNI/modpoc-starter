import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { JSDOM } from 'jsdom'
import { mountForm, VERSION } from '@maktorni/module-form'
import { settings } from '../main.js'

const ROOT = new URL('../', import.meta.url)

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), 'utf8'))
}

function mountWithClientSettings() {
  const { window } = new JSDOM('<div id="form"></div>')
  const el = window.document.getElementById('form')
  mountForm(el, settings)
  return { window, el }
}

describe('client site', () => {
  it('should resolve the importmap path to the installed module', async () => {
    const html = await readFile(new URL('index.html', ROOT), 'utf8')
    const importmap = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1])
    const modulePath = importmap.imports['@maktorni/module-form']
    assert.ok(existsSync(new URL(modulePath, ROOT)), `missing ${modulePath}`)
  })

  it('should run the installed version of the module', async () => {
    const installed = await readJson('node_modules/@maktorni/module-form/package.json')
    assert.equal(VERSION, installed.version)
  })

  it('should render the form with the client settings', () => {
    const { el } = mountWithClientSettings()
    assert.equal(el.querySelector('.mf__title').textContent, settings.title)
    assert.ok(el.querySelector('input[name="name"]'))
    assert.ok(el.querySelector('input[name="email"]'))
    assert.equal(el.querySelector('.mf__version').textContent, `module-form v${VERSION}`)

    // Catches renamed options after a major update: the client's label must still reach the button.
    const expectedLabel = settings.submitLabel ?? settings.buttonText
    if (expectedLabel) {
      assert.equal(el.querySelector('button[type="submit"]').textContent, expectedLabel)
    }
  })

  it('should accept a valid submission', () => {
    const { window, el } = mountWithClientSettings()
    const form = el.querySelector('form')
    form.elements.name.value = 'Тест'
    form.elements.email.value = 'test@example.com'
    form.dispatchEvent(new window.Event('submit', { cancelable: true }))
    assert.match(el.querySelector('.mf__success').textContent, /Благодарим/)
  })
})
