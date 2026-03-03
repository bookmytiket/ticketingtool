// Script to set up a department head in Supabase
import supabase from '../config/supabase.js'
import dotenv from 'dotenv'

dotenv.config()

async function setupDepartmentHead() {
  try {
    console.log('🚀 Setting up department head in Supabase...')

    // Get user email from command line args or use default
    const userEmail = process.argv[2] || 'avenkadesh@rezilyens.com'
    const departmentName = process.argv[3] || null

    console.log(`\n🔍 Looking for user: ${userEmail}`)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle()

    if (userError || !user) {
      console.error(`❌ User not found: ${userEmail}`)
      process.exit(1)
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`)
    console.log(`   Current role: ${user.role}`)
    console.log(`   Current department ID: ${user.department_id || 'None'}`)

    // Find or create department
    let department = null
    if (departmentName) {
      const { data: existingDept } = await supabase
        .from('departments')
        .select('*')
        .eq('name', departmentName)
        .maybeSingle()

      department = existingDept

      if (!department) {
        console.log(`\n⚠️  Department "${departmentName}" not found. Creating...`)
        const orgId = user.organization_id
        if (!orgId) {
          console.error('❌ User has no organization. Cannot create department.')
          process.exit(1)
        }
        const { data: newDept, error: createError } = await supabase
          .from('departments')
          .insert([{
            name: departmentName,
            organization_id: orgId,
            head_id: user.id,
            is_active: true,
          }])
          .select()
          .single()

        if (createError) throw createError
        department = newDept
        console.log(`✅ Created department: ${department.name}`)
      } else {
        console.log(`✅ Found department: ${department.name}`)
      }
    } else {
      // Try to find user's existing department
      if (user.department_id) {
        const { data: existingDept } = await supabase
          .from('departments')
          .select('*')
          .eq('id', user.department_id)
          .maybeSingle()
        department = existingDept
        if (department) {
          console.log(`✅ Found user's existing department: ${department.name}`)
        }
      }

      // If no department, find first available department
      if (!department) {
        const orgId = user.organization_id
        if (orgId) {
          const { data: availableDept } = await supabase
            .from('departments')
            .select('*')
            .eq('organization_id', orgId)
            .limit(1)
            .maybeSingle()

          department = availableDept

          if (department) {
            console.log(`✅ Found first available department: ${department.name}`)
          } else {
            console.log(`\n⚠️  No departments found. Creating default department...`)
            const { data: newDept, error: createError } = await supabase
              .from('departments')
              .insert([{
                name: 'Default Department',
                organization_id: orgId,
                head_id: user.id,
                is_active: true,
              }])
              .select()
              .single()

            if (createError) throw createError
            department = newDept
            console.log(`✅ Created default department: ${department.name}`)
          }
        }
      }
    }

    if (!department) {
      console.error('❌ Could not find or create a department')
      process.exit(1)
    }

    // Update user to be department head
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        role: 'department-head',
        department_id: department.id
      })
      .eq('id', user.id)

    if (updateUserError) throw updateUserError
    console.log(`\n✅ Updated user:`)
    console.log(`   Role: department-head`)
    console.log(`   Department: ${department.name}`)

    // Update department to have this user as head
    const { error: updateDeptError } = await supabase
      .from('departments')
      .update({ head_id: user.id })
      .eq('id', department.id)

    if (updateDeptError) throw updateDeptError
    console.log(`✅ Updated department head: ${user.name}`)

    // Update tickets without departments to have this department
    const orgId = user.organization_id
    const { data: ticketsWithoutDept, error: ticketsError } = await supabase
      .from('tickets')
      .select('id')
      .eq('organization_id', orgId)
      .is('department_id', null)

    if (ticketsWithoutDept?.length > 0) {
      console.log(`\n📝 Found ${ticketsWithoutDept.length} tickets without departments`)
      await supabase
        .from('tickets')
        .update({ department_id: department.id })
        .eq('organization_id', orgId)
        .is('department_id', null)
      console.log(`✅ Assigned tickets to department: ${department.name}`)
    }

    // Show approval pending tickets
    const { data: approvalPendingTickets } = await supabase
      .from('tickets')
      .select('ticket_id, title, creator:users!creator_id(name, email)')
      .eq('department_id', department.id)
      .eq('status', 'approval-pending')

    console.log(`\n📋 Approval Pending Tickets (${approvalPendingTickets?.length || 0}):`)
    if (!approvalPendingTickets || approvalPendingTickets.length === 0) {
      console.log('   No approval pending tickets found')
    } else {
      approvalPendingTickets.forEach(ticket => {
        console.log(`   #${ticket.ticket_id}: ${ticket.title} (Created by: ${ticket.creator?.name || 'Unknown'})`)
      })
    }

    console.log(`\n✅ Setup complete!`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

setupDepartmentHead()


