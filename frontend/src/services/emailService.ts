// Email notification service
// In production, this would connect to your backend API

export const sendTicketCreatedEmail = async (ticket, userEmail) => {
  // Simulate email sending
  console.log('Sending ticket created email...', {
    to: userEmail,
    subject: `Ticket Created: #${ticket.id} - ${ticket.title}`,
    body: generateTicketCreatedEmail(ticket),
  })

  // In production, this would be an API call:
  // return await fetch('/api/email/send', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     to: userEmail,
  //     subject: `Ticket Created: #${ticket.id} - ${ticket.title}`,
  //     html: generateTicketCreatedEmail(ticket),
  //   }),
  // })

  return { success: true }
}

export const sendTicketUpdatedEmail = async (ticket, userEmail, changes) => {
  console.log('Sending ticket updated email...', {
    to: userEmail,
    subject: `Ticket Updated: #${ticket.id} - ${ticket.title}`,
    body: generateTicketUpdatedEmail(ticket, changes),
  })

  return { success: true }
}

export const sendTicketCommentEmail = async (ticket, userEmail, comment) => {
  console.log('Sending ticket comment email...', {
    to: userEmail,
    subject: `New Comment on Ticket #${ticket.id}`,
    body: generateTicketCommentEmail(ticket, comment),
  })

  return { success: true }
}

const generateTicketCreatedEmail = (ticket) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; }
        .ticket-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
        .ticket-id { font-size: 24px; font-weight: bold; color: #0ea5e9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ticket Created Successfully</h1>
        </div>
        <div class="content">
          <p>Your support ticket has been created successfully. Here are the details:</p>
          
          <div class="ticket-info">
            <div class="ticket-id">Ticket #${ticket.id}</div>
            <h2>${ticket.title}</h2>
            <p><strong>Category:</strong> ${ticket.category}</p>
            <p><strong>Priority:</strong> <span style="text-transform: capitalize;">${ticket.priority}</span></p>
            <p><strong>Status:</strong> <span style="text-transform: capitalize;">${ticket.status}</span></p>
            <p><strong>Created:</strong> ${new Date(ticket.created).toLocaleString()}</p>
            ${ticket.assignee ? `<p><strong>Assigned to:</strong> ${ticket.assignee}</p>` : ''}
          </div>

          <div class="ticket-info">
            <h3>Description:</h3>
            <p>${ticket.description}</p>
          </div>

          <p style="text-align: center;">
            <a href="${window.location.origin}/tickets/${ticket.id}" class="button">View Ticket</a>
          </p>

          <p>You will receive email notifications when there are updates to this ticket.</p>
        </div>
        <div class="footer">
          <p>This is an automated email from the Ticketing System.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generateTicketUpdatedEmail = (ticket, changes) => {
  const changesList = Object.entries(changes)
    .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; }
        .ticket-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
        .ticket-id { font-size: 24px; font-weight: bold; color: #0ea5e9; }
        .changes { background: #fff3cd; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ticket Updated</h1>
        </div>
        <div class="content">
          <p>Your ticket has been updated. Here are the changes:</p>
          
          <div class="ticket-info">
            <div class="ticket-id">Ticket #${ticket.id}</div>
            <h2>${ticket.title}</h2>
          </div>

          <div class="changes">
            <h3>Changes Made:</h3>
            <ul>
              ${changesList}
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${window.location.origin}/tickets/${ticket.id}" class="button">View Ticket</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated email from the Ticketing System.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generateTicketCommentEmail = (ticket, comment) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; }
        .ticket-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
        .comment { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #10b981; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Comment on Ticket</h1>
        </div>
        <div class="content">
          <div class="ticket-info">
            <div class="ticket-id">Ticket #${ticket.id}</div>
            <h2>${ticket.title}</h2>
          </div>

          <div class="comment">
            <p><strong>${comment.author}</strong> added a comment:</p>
            <p>${comment.content}</p>
            <p style="color: #666; font-size: 12px;">${new Date(comment.created).toLocaleString()}</p>
          </div>

          <p style="text-align: center;">
            <a href="${window.location.origin}/tickets/${ticket.id}" class="button">View Ticket</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated email from the Ticketing System.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

