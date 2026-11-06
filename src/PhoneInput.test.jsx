import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import PhoneInput from './PhoneInput.jsx'
import { displayPhone, isCompletePhone, phoneDigits, phoneLink, toStoredPhone } from './phoneFormat.js'

function Host({ initial = '' }) {
  const [value, setValue] = useState(initial)

  return (
    <>
      <label htmlFor="p">Phone</label>
      <PhoneInput id="p" value={value} onChange={setValue} className="x" />
      <output>{value}</output>
    </>
  )
}

const typeInto = async (text, initial) => {
  const user = userEvent.setup()
  render(<Host initial={initial} />)
  await user.type(screen.getByLabelText('Phone'), text)

  return { field: screen.getByLabelText('Phone'), saved: document.querySelector('output').textContent }
}

describe('phone number helpers', () => {
  it.each([
    ['9123456789', '9123456789'],
    ['0912 345 6789', '9123456789'],
    ['+63 912 345 6789', '9123456789'],
    ['639123456789', '9123456789'],
    ['91234567890123', '9123456789'],
    ['8123456789', ''],
    ['0', ''],
    ['', ''],
  ])('reads %j as the digits %j', (input, digits) => {
    expect(phoneDigits(input)).toBe(digits)
  })

  it('saves as "+63 912 345 6789" and only counts a full 10-digit mobile number as complete', () => {
    expect(toStoredPhone('9123456789')).toBe('+63 912 345 6789')
    expect(toStoredPhone('')).toBe('')
    expect(isCompletePhone('+63 912 345 6789')).toBe(true)
    expect(isCompletePhone('+63 912 345')).toBe(false)
    expect(isCompletePhone('')).toBe(false)
  })
})

describe('PhoneInput', () => {
  it('shows the fixed +63 prefix', () => {
    render(<Host />)

    expect(screen.getByText('+63')).toBeInTheDocument()
  })

  it('groups the digits as they are typed and saves them with +63', async () => {
    const { field, saved } = await typeInto('9123456789')

    expect(field).toHaveValue('912 345 6789')
    expect(saved).toBe('+63 912 345 6789')
  })

  it('drops a leading 0 and accepts nothing before a 9', async () => {
    const zero = await typeInto('0912 345 6789')
    expect(zero.field).toHaveValue('912 345 6789')
  })

  it('ignores a first digit that is not 9, letters and symbols', async () => {
    const { field, saved } = await typeInto('8-abc')

    expect(field).toHaveValue('')
    expect(saved).toBe('')
  })

  it('stops at 10 digits', async () => {
    const { field } = await typeInto('912345678999')

    expect(field).toHaveValue('912 345 6789')
  })

  it('tidies a pasted number that includes the country code', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.click(screen.getByLabelText('Phone'))
    await user.paste('+63 912 345 6789')

    expect(screen.getByLabelText('Phone')).toHaveValue('912 345 6789')
  })

  it('shows an already saved number in the same format', () => {
    render(<Host initial="0917 000 0000" />)

    expect(screen.getByLabelText('Phone')).toHaveValue('917 000 0000')
  })
})

describe('showing saved phone numbers', () => {
  it.each([
    ['0917 000 0000', '+63 917 000 0000'],
    ['09170000000', '+63 917 000 0000'],
    ['+639170000000', '+63 917 000 0000'],
    ['+63 917 000 0000', '+63 917 000 0000'],
    ['+63 900 123 4567', '+63 900 123 4567'],
  ])('shows %j as %j', (saved, shown) => {
    expect(displayPhone(saved)).toBe(shown)
  })

  it('leaves a number that is not a Philippine mobile number exactly as saved', () => {
    expect(displayPhone('(02) 8123-4567')).toBe('(02) 8123-4567')
    expect(displayPhone('')).toBe('')
    expect(displayPhone(null)).toBe('')
  })

  it('builds a tel: link without spaces', () => {
    expect(phoneLink('0917 000 0000')).toBe('+639170000000')
    expect(phoneLink('(02) 8123-4567')).toBe('(02)8123-4567')
  })
})
