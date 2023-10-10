export async function up(knex) {
  await knex.schema.createTable('cccxmls-1-mappings', (table) => {
    table.increments('id')
    table.string('text')
  })
}

export async function down(knex) {
  await knex.schema.dropTable('cccxmls-1-mappings')
}
