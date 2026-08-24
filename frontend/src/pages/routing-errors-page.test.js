import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getRoutingErrors: vi.fn(),
  resolveRoutingError: vi.fn(),
  removeRoutingError: vi.fn(),
}))

vi.mock('@/services/api.js', () => api)

const { RoutingErrorsPage } = await import('./routing-errors-page.js')

const row = {
  CCCSFTPXML: 42,
  XMLFILENAME: 'AUCHAN_181791994.xml',
  JSONDATA: JSON.stringify({ routing: { orderId: '999' } }),
}

describe('RoutingErrorsPage _delete', () => {
  let page
  let confirmSpy

  beforeEach(() => {
    page = new RoutingErrorsPage()
    api.getRoutingErrors.mockReset().mockResolvedValue({ data: [] })
    api.removeRoutingError.mockReset().mockResolvedValue({})
    // happy-dom does not implement window.confirm, so it must be created, not spied on.
    confirmSpy = vi.fn()
    window.confirm = confirmSpy
  })

  afterEach(() => {
    delete window.confirm
  })

  it('nu șterge dacă prima confirmare este anulată', async () => {
    confirmSpy.mockReturnValueOnce(false)
    await page._delete(row)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(api.removeRoutingError).not.toHaveBeenCalled()
  })

  it('nu șterge dacă a doua confirmare este anulată', async () => {
    confirmSpy.mockReturnValueOnce(true).mockReturnValueOnce(false)
    await page._delete(row)
    expect(confirmSpy).toHaveBeenCalledTimes(2)
    expect(api.removeRoutingError).not.toHaveBeenCalled()
  })

  it('șterge doar după ambele confirmări, iar a doua menționează fișierul și comanda', async () => {
    confirmSpy.mockReturnValueOnce(true).mockReturnValueOnce(true)
    await page._delete(row)
    expect(api.removeRoutingError).toHaveBeenCalledWith(42)
    expect(confirmSpy.mock.calls[1][0]).toContain('AUCHAN_181791994.xml')
    expect(confirmSpy.mock.calls[1][0]).toContain('999')
  })
})
