'use strict';

/**
 * Turns raw office-hours availability data into a readable assistant reply.
 */

function formatSlot(slot) {
  return `${slot.start}–${slot.end}`;
}

function capitalize(value = '') {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function personLabel(name = '') {
  return name || 'This instructor';
}

function formatResults(results) {
  return results.map((item) => {
    const parts = [`**${personLabel(item.name)}** — ${formatSlot(item)}`];
    if (item.department) parts.push(item.department);
    if (item.office) parts.push(`office ${item.office}`);
    return `• ${parts.join(' · ')}`;
  }).join('\n');
}

function formatNextDays(days, limitDays = 3) {
  if (!Array.isArray(days) || days.length === 0) return '';

  return days.slice(0, limitDays).map((day) => {
    const slots = day.slots.map((slot) => `${slot.name} ${formatSlot(slot)}`).join('; ');
    return `• ${day.dayName} ${day.dateLabel}: ${slots}`;
  }).join('\n');
}

function formatNextPersonSlots(person) {
  if (!Array.isArray(person?.nextSlots) || person.nextSlots.length === 0) return '';
  return person.nextSlots
    .slice(0, 5)
    .map((slot) => {
      const day = /^(today|tomorrow)$/i.test(slot.dayLabel)
        ? `${slot.dayLabel} (${slot.dateLabel})`
        : slot.dayLabel;
      return `• ${day}: ${formatSlot(slot)}`;
    })
    .join('\n');
}

function isSpecificDayTarget(target = {}) {
  if (!target) return false;
  if (target.isNow || target.wholeDay) return false;
  if (target.specificDay) return true;
  const label = target.targetLabel || '';
  return /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(label);
}

function extractFirstNextSlot(nextSlotsText = '') {
  if (!nextSlotsText) return '';
  const lines = nextSlotsText.split('\n').map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('•')) {
      return line.replace(/^•\s*/, '').trim();
    }
  }
  return '';
}

function composePersonReply(data) {
  const person = data.person || {};
  const name = personLabel(person.name);
  const target = data.target || {};
  const isSpecificDay = isSpecificDayTarget(target);

  if (person.found === false) {
    return [
      `I couldn't find a verified instructor named **${person.name}** in the directory.`,
      `Check the spelling, or ask me “who's free tomorrow?” to see who is available.`
    ].join('\n\n');
  }

  if (person.ambiguous) {
    const names = (person.matches || []).map((match) => `**${match.name}**${match.department ? ` (${match.department})` : ''}`);
    return [
      `I found more than one match for **${person.name}**:`,
      names.map((item) => `• ${item}`).join('\n'),
      'Which one did you mean?'
    ].join('\n\n');
  }

  const nextSlotsText = formatNextPersonSlots(person);
  const todaySlots = Array.isArray(person.todaySlots) && person.todaySlots.length > 0
    ? person.todaySlots.map((slot) => `${slot.start}–${slot.end}`).join(', ')
    : '';

  if (person.freeNow && target.isNow) {
    const slot = person.freeNowSlot ? ` (${person.freeNowSlot.start}–${person.freeNowSlot.end})` : '';
    return `Yes — **${name}** is free right now${slot}.`;
  }

  if (isSpecificDay && data.results.length > 0) {
    const slots = data.results.map((r) => formatSlot(r)).join(', ');
    const date = data.results[0].dateLabel ? ` (${data.results[0].dateLabel})` : '';
    const dayLabel = target.targetLabel || 'that day';
    return `Yes — **${name}** is free on ${dayLabel}${date} from ${slots}.`;
  }

  if (isSpecificDay && data.results.length === 0) {
    const dayLabel = target.targetLabel || 'that day';
    const first = extractFirstNextSlot(nextSlotsText);
    if (first) {
      return `No — **${name}** isn't free on ${dayLabel}. Next: ${first}.`;
    }
    if (Array.isArray(data.allNextAvailable) && data.allNextAvailable.length > 0) {
      const day = data.allNextAvailable[0];
      const slots = Array.isArray(day.slots) && day.slots.length > 0
        ? day.slots.map((slot) => `${slot.name} ${slot.start}–${slot.end}`).join('; ')
        : '';
      if (slots) {
        return `No — **${name}** isn't free on ${dayLabel}. Next: ${day.dayName} ${day.dateLabel}: ${slots}.`;
      }
    }
    return `No — **${name}** isn't free on ${dayLabel}.`;
  }

  if (data.results.length > 0) {
    return [
      `Yes — **${name}** is available ${target.targetLabel}.`,
      formatResults(data.results),
      data.disclaimer
    ].filter(Boolean).join('\n\n');
  }

  const parts = [
    target.isNow
      ? `**${name}** isn't free right now.`
      : `**${name}** isn't available ${target.targetLabel}.`
  ];

  if (target.isToday && todaySlots) {
    parts.push(`Their published office hours today: ${todaySlots}.`);
  }

  if (nextSlotsText) {
    const first = extractFirstNextSlot(nextSlotsText);
    if (first) {
      parts.push(`Next verified slot: ${first}.`);
    } else {
      parts.push(`Next verified slots:\n${nextSlotsText}`);
    }
  } else if (Array.isArray(data.allNextAvailable) && data.allNextAvailable.length > 0) {
    const day = data.allNextAvailable[0];
    const slots = Array.isArray(day.slots) && day.slots.length > 0
      ? day.slots.map((slot) => `${slot.name} ${slot.start}–${slot.end}`).join('; ')
      : '';
    if (slots) {
      parts.push(`Next verified slot: ${day.dayName} ${day.dateLabel}: ${slots}.`);
    } else {
      parts.push(`Next verified slots:\n${formatNextDays(data.allNextAvailable, 1)}`);
    }
  } else {
    parts.push('I do not have any verified office hours for them right now.');
  }

  return parts.filter(Boolean).join('\n\n');
}

function composeGeneralReply(data) {
  const { results, target } = data;
  const nextDays = formatNextDays(data.nextAvailable || data.allNextAvailable || [], 3);

  if (results.length > 0) {
    let header;
    if (target.isNow) {
      header = `Right now (${data.currentTimeLabel}) ${results.length} verified ${results.length === 1 ? 'instructor has' : 'instructors have'} published office hours:`;
    } else if (target.wholeDay) {
      header = `${capitalize(target.targetLabel)}, ${results.length} verified ${results.length === 1 ? 'instructor has' : 'instructors have'} published office hours:`;
    } else {
      header = `${results.length} verified ${results.length === 1 ? 'instructor is' : 'instructors are'} available ${target.targetLabel}:`;
    }

    const more = data.total > results.length ? `\n…and ${data.total - results.length} more.` : '';

    return [
      header,
      formatResults(results) + more,
      data.disclaimer
    ].filter(Boolean).join('\n\n');
  }

  const parts = [];

  if (target.isNow) {
    parts.push(`No verified instructor has published office hours right now (${data.currentTimeLabel}).`);
  } else if (target.wholeDay) {
    parts.push(`No verified instructor has published office hours for ${target.targetLabel}.`);
  } else {
    parts.push(`No verified instructor has published office hours ${target.targetLabel}.`);
  }

  if (data.dayNote) {
    parts.push(data.dayNote);
  }

  if (nextDays) {
    parts.push(`The next verified slots are:\n${nextDays}`);
  } else {
    parts.push('I do not have any verified slots in the next two weeks.');
  }

  parts.push(data.disclaimer);
  return parts.filter(Boolean).join('\n\n');
}

function buildAvailabilityAnswer(data) {
  if (!data) return null;

  const response = data.person ? composePersonReply(data) : composeGeneralReply(data);
  const quickReplies = [];

  if (data.person?.found && data.person.name) {
    const name = data.person.name;
    quickReplies.push(`Is ${name} free now?`);
    quickReplies.push(`What is ${name}'s email?`);
  } else {
    quickReplies.push("Who's free tomorrow?");
    quickReplies.push("Who's free on Saturday?");
  }

  quickReplies.push("What's the next deadline?");

  return {
    ...data,
    type: 'availability',
    response,
    quickReplies: quickReplies.slice(0, 3)
  };
}

module.exports = {
  buildAvailabilityAnswer,
  formatSlot,
  formatNextDays,
  formatResults
};
