import { getUserAccounts } from '@/actions/dashboard'
import { defaultCategories } from '@/app/data/catagories'
import React from 'react'
import { AddTransactionForm } from '../_components/transaction-form'
import { getTransaction } from '@/actions/trasaction'

const AddTransactionPage = async ({ searchParams }: { searchParams: { edit?: string } }) => {
  const accounts = await getUserAccounts()
  const editId = searchParams?.edit;

  let initialData = null;
  if (editId) {
    const transaction = await getTransaction(editId);
    initialData = transaction
      ? {
          id: transaction.id as string,
          amount: transaction.amount,
          date: transaction.date as string,
          description: transaction.description as string | undefined,
        }
      : null;
  }
  
  return (
    <div className="max-w-3xl mx-auto px-5">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title ">{editId ? "Edit" : "Add"} Transaction</h1>
      </div>
      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        editMode={!!editId}
        initialData={initialData}
      />
    </div>
  )
}

export default AddTransactionPage