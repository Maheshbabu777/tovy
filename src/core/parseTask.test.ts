import { addedMessage, parseTask } from './parseTask'

// Saturday 3 October 2026, 10:00 in the morning.
const now = new Date(2026, 9, 3, 10, 0)
const projects = [
  { id: 'p-home', name: 'Home' },
  { id: 'p-big', name: 'Big ideas' },
  { id: 'p-launch', name: 'Launch' },
  { id: 'p-launch2', name: 'Launch party' },
]
const parse = (text: string, at = now) => parseTask(text, at, projects)

describe('quick add reads the words', () => {
  it('leaves plain text alone', () => {
    expect(parse('Call mum')).toEqual({ title: 'Call mum', dueDate: null, dueTime: null, projectId: null, tokens: [] })
  })

  it('reads today, tomorrow and their short forms', () => {
    expect(parse('Call mum today')).toMatchObject({ title: 'Call mum', dueDate: '2026-10-03' })
    expect(parse('Call mum tomorrow')).toMatchObject({ title: 'Call mum', dueDate: '2026-10-04' })
    expect(parse('pay rent tmr')).toMatchObject({ title: 'pay rent', dueDate: '2026-10-04' })
    expect(parse('TOMORROW write report')).toMatchObject({ title: 'write report', dueDate: '2026-10-04' })
  })

  it('reads weekdays as the next one, never today', () => {
    expect(parse('gym monday')).toMatchObject({ title: 'gym', dueDate: '2026-10-05' })
    expect(parse('gym on fri')).toMatchObject({ title: 'gym', dueDate: '2026-10-09' })
    expect(parse('review on sat')).toMatchObject({ title: 'review', dueDate: '2026-10-10' }) // today is Saturday
    expect(parse('review saturday')).toMatchObject({ dueDate: '2026-10-10' })
    expect(parse('dentist fri at 4')).toMatchObject({ title: 'dentist', dueDate: '2026-10-09', dueTime: '16:00' })
    expect(parse('review next monday')).toMatchObject({ title: 'review', dueDate: '2026-10-12' })
    expect(parse('plan next week')).toMatchObject({ title: 'plan', dueDate: '2026-10-05' })
  })

  it('reads in N days and weeks', () => {
    expect(parse('renew in 3 days')).toMatchObject({ title: 'renew', dueDate: '2026-10-06' })
    expect(parse('renew in 2 weeks')).toMatchObject({ title: 'renew', dueDate: '2026-10-17' })
  })

  it('reads calendar dates, day first, rolling to next year when passed', () => {
    expect(parse('dentist 5 oct')).toMatchObject({ title: 'dentist', dueDate: '2026-10-05' })
    expect(parse('dentist oct 5th')).toMatchObject({ title: 'dentist', dueDate: '2026-10-05' })
    expect(parse('taxes 31 july')).toMatchObject({ title: 'taxes', dueDate: '2027-07-31' })
    expect(parse('party 12/10')).toMatchObject({ title: 'party', dueDate: '2026-10-12' })
    expect(parse('trip 2 jan 2028')).toMatchObject({ title: 'trip', dueDate: '2028-01-02' })
    expect(parse('bad 31 feb')).toMatchObject({ title: 'bad 31 feb', dueDate: null })
  })

  it('reads times, with or without a day', () => {
    expect(parse('call tomorrow 5pm')).toMatchObject({ title: 'call', dueDate: '2026-10-04', dueTime: '17:00' })
    expect(parse('call at 5:30 pm')).toMatchObject({ title: 'call', dueDate: '2026-10-03', dueTime: '17:30' })
    expect(parse('standup 09:15 monday')).toMatchObject({ title: 'standup', dueDate: '2026-10-05', dueTime: '09:15' })
    expect(parse('lunch at noon')).toMatchObject({ title: 'lunch', dueTime: '12:00' })
    expect(parse('call at 3')).toMatchObject({ title: 'call', dueTime: '15:00' })
    expect(parse('run at 7')).toMatchObject({ title: 'run', dueTime: '07:00' })
  })

  it('a time already past today means tomorrow', () => {
    expect(parse('call 9am')).toMatchObject({ dueDate: '2026-10-04', dueTime: '09:00' })
    expect(parse('call 11am')).toMatchObject({ dueDate: '2026-10-03', dueTime: '11:00' })
  })

  it('tonight is today at 8 PM unless a time is given', () => {
    expect(parse('movie tonight')).toMatchObject({ title: 'movie', dueDate: '2026-10-03', dueTime: '20:00' })
    expect(parse('movie tonight 9pm')).toMatchObject({ dueTime: '21:00' })
  })

  it('files the task in a project by name, spaces optional, shortest prefix wins', () => {
    expect(parse('fix sink #home')).toMatchObject({ title: 'fix sink', projectId: 'p-home' })
    expect(parse('#bigideas write it down')).toMatchObject({ title: 'write it down', projectId: 'p-big' })
    expect(parse('send invites #laun')).toMatchObject({ projectId: 'p-launch' })
    expect(parse('send invites #launchparty')).toMatchObject({ projectId: 'p-launch2' })
  })

  it('keeps an unknown #word in the title', () => {
    expect(parse('read #unknown')).toMatchObject({ title: 'read #unknown', projectId: null })
  })

  it('takes one of each and leaves the rest in the title', () => {
    expect(parse('move today to tomorrow')).toMatchObject({ title: 'move to tomorrow', dueDate: '2026-10-03' })
  })

  it('never leaves a task without a title', () => {
    expect(parse('tomorrow')).toMatchObject({ title: 'tomorrow', dueDate: null })
    expect(parse('monday')).toMatchObject({ title: 'monday', dueDate: null })
  })

  it('does not read words that only contain a day or a month', () => {
    expect(parse('Sunday roast prep')).toMatchObject({ dueDate: '2026-10-04', title: 'roast prep' })
    expect(parse('marketing plan')).toMatchObject({ title: 'marketing plan', dueDate: null })
    expect(parse('update docs')).toMatchObject({ title: 'update docs', dueDate: null })
    expect(parse('buy 2 apples')).toMatchObject({ title: 'buy 2 apples', dueDate: null })
  })

  it('leaves ordinary titles alone (found in review)', () => {
    const plain = (t: string) => expect(parse(t)).toMatchObject({ title: t, dueDate: null, dueTime: null })
    plain("Finish today's report")
    plain("Prep for Monday's meeting")
    plain('Apply sun cream')
    plain('SAT prep')
    plain('Call Tod')
    plain('24/7 support rota')
    plain('Rate 4/5 stars')
    plain('Look at 5 options')
    plain('Read John 3:16')
    plain('Set screen to 16:9')
  })

  it('still reads the marked forms of those', () => {
    expect(parse('support rota on 24/7')).toMatchObject({ title: 'support rota', dueDate: '2027-07-24' })
    expect(parse('call at 5 tomorrow')).toMatchObject({ title: 'call', dueDate: '2026-10-04', dueTime: '17:00' })
    expect(parse('read at 9:15')).toMatchObject({ title: 'read', dueTime: '09:15' })
  })

  it('reports what it read for the chips', () => {
    expect(parse('call tomorrow 5pm #home').tokens).toEqual([
      { kind: 'date', text: 'tomorrow', label: 'Tomorrow' },
      { kind: 'time', text: '5pm', label: '5 PM' },
      { kind: 'project', text: '#home', label: 'Home' },
    ])
    expect(parse('trip 2 jan 2028').tokens[0].label).toBe('Sun 2 Jan 2028')
  })
})

describe('the added toast', () => {
  it('says what was added and where', () => {
    expect(addedMessage({ title: 'Call mum', dueDate: '2026-10-04', dueTime: '17:00' }, now, 'Home')).toBe(
      'Added "Call mum" · Tomorrow, 5 PM · Home',
    )
    expect(addedMessage({ title: 'Read', dueDate: null, dueTime: null }, now)).toBe('Added "Read"')
  })
})
