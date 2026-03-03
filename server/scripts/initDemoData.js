// Script to initialize all demo data in Supabase
import supabase from '../config/supabase.js'
import bcrypt from 'bcryptjs'

const createDemoData = async () => {
  try {
    console.log('🚀 Initializing demo data in Supabase...')

    // 0. Create Default Organization (or get existing)
    let { data: defaultOrg, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('name', 'Default Organization')
      .maybeSingle()

    if (orgError) throw orgError

    if (!defaultOrg) {
      const { data: newOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert([{
          name: 'Default Organization',
          domain: null,
          description: 'Default organization for existing users and tickets',
          status: 'active',
          settings: {
            allowSelfRegistration: false,
            defaultRole: 'user',
          },
        }])
        .select()
        .single()

      if (createOrgError) throw createOrgError
      defaultOrg = newOrg
      console.log('✅ Created default organization')
    } else {
      console.log('ℹ️  Default organization already exists')
    }

    // 1. Create Demo Users
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash('admin123', salt)
    const userHashedPassword = await bcrypt.hash('user123', salt)
    const agentHashedPassword = await bcrypt.hash('agent123', salt)

    const demoUsers = [
      { name: 'Admin User', email: 'admin@example.com', password: hashedPassword, role: 'admin' },
      { name: 'Regular User', email: 'user@example.com', password: userHashedPassword, role: 'user' },
      { name: 'Agent User', email: 'agent@example.com', password: agentHashedPassword, role: 'technician' }, // Agent is technician in Supabase
    ]

    const userIds = {}
    for (const userData of demoUsers) {
      let { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .maybeSingle()

      if (userError) throw userError

      if (!user) {
        const { data: newUser, error: createUserError } = await supabase
          .from('users')
          .insert([{
            ...userData,
            status: 'active',
            organization_id: defaultOrg.id,
          }])
          .select()
          .single()

        if (createUserError) throw createUserError
        user = newUser
        console.log(`✅ Created demo user: ${userData.email} (${userData.role})`)
      } else {
        // Ensure existing user has organization
        if (!user.organization_id) {
          await supabase
            .from('users')
            .update({ organization_id: defaultOrg.id })
            .eq('id', user.id)
          console.log(`✅ Updated user ${userData.email} with default organization`)
        }
        console.log(`ℹ️  Demo user already exists: ${userData.email}`)
      }
      userIds[userData.role] = user.id
    }

    // 2. Create Demo Roles (if table exists)
    const demoRoles = [
      { name: 'Admin', permissions: ['all'] },
      { name: 'Agent', permissions: ['view_tickets', 'update_tickets', 'assign_tickets'] },
      { name: 'User', permissions: ['view_own_tickets', 'create_tickets'] },
    ]

    for (const roleData of demoRoles) {
      const { data: existingRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleData.name)
        .maybeSingle()

      if (!existingRole) {
        await supabase.from('roles').insert([roleData])
        console.log(`✅ Created role: ${roleData.name}`)
      }
    }

    // 3. Create Demo Tickets (only if no tickets exist)
    const { count: ticketCount, error: countError } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })

    if (countError) throw countError

    if (ticketCount === 0 && userIds.user && userIds.technician) {
      const demoTickets = [
        {
          title: 'Unable to login to the system',
          description: 'I am unable to login to my account. Getting an error message.',
          category: 'Technical',
          priority: 'high',
          status: 'open',
          creator_id: userIds.user,
          assignee_id: userIds.technician,
          organization_id: defaultOrg.id,
        },
        {
          title: 'Feature request: Dark mode',
          description: 'It would be great to have a dark mode option for the application.',
          category: 'Feature Request',
          priority: 'low',
          status: 'open',
          creator_id: userIds.user,
          organization_id: defaultOrg.id,
        },
        {
          title: 'Password reset not working',
          description: 'The password reset email is not being received.',
          category: 'Technical',
          priority: 'urgent',
          status: 'in-progress',
          creator_id: userIds.user,
          assignee_id: userIds.technician,
          organization_id: defaultOrg.id,
        },
      ]

      const { data: createdTickets, error: insertTicketsError } = await supabase
        .from('tickets')
        .insert(demoTickets)
        .select()

      if (insertTicketsError) throw insertTicketsError
      console.log(`✅ Created ${createdTickets.length} demo tickets`)
    } else {
      console.log(`ℹ️  Tickets already exist (${ticketCount} tickets)`)
    }

    // 4. Initialize SSO Configs
    const ssoProviders = ['azure', 'google']
    for (const provider of ssoProviders) {
      const { data: existing } = await supabase
        .from('sso_config')
        .select('id')
        .eq('provider', provider)
        .maybeSingle()

      if (!existing) {
        await supabase.from('sso_config').insert([{
          provider,
          enabled: false,
          config: {},
        }])
        console.log(`✅ Created SSO config: ${provider}`)
      }
    }

    // 5. Initialize Email Settings
    const { data: emailSettings } = await supabase
      .from('email_settings')
      .select('id')
      .maybeSingle()

    if (!emailSettings) {
      await supabase.from('email_settings').insert([{
        smtp_config: {
          host: '',
          port: 587,
          secure: false,
          auth: { user: '', pass: '' },
          enabled: false
        },
        imap_config: {
          host: '',
          port: 993,
          secure: true,
          auth: { user: '', pass: '' },
          enabled: false
        },
      }])
      console.log('✅ Created email settings')
    }

    console.log('✅ Demo data initialization complete!')
  } catch (error) {
    console.error('❌ Error creating demo data:', error.message)
  }
}

export default createDemoData


