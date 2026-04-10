import random
import csv
import os

def generate_dataset(num_records=1000, output_file='large_test_dataset.csv'):
    # PaySim columns: step,type,amount,nameOrig,oldbalanceOrg,newbalanceOrig,nameDest,oldbalanceDest,newbalanceDest,isFraud,isFlaggedFraud
    merchant_prefix = 'M'
    customer_prefix = 'C'
    
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['step','type','amount','nameOrig','oldbalanceOrg','newbalanceOrig','nameDest','oldbalanceDest','newbalanceDest','isFraud','isFlaggedFraud'])
        
        for i in range(1, num_records + 1):
            step = random.randint(1, 10)
            
            # 60% safe, 30% grey area (requires review), 10% obvious fraud
            category = random.choices(['safe', 'grey', 'fraud'], weights=[0.60, 0.30, 0.10])[0]
            
            if category == 'safe':
                # Small everyday transactions
                type_ = random.choice(['PAYMENT', 'CASH_IN', 'DEBIT'])
                amount = round(random.uniform(10.0, 5000.0), 2)
                oldbalanceOrg = round(random.uniform(amount, 100000.0), 2)
                newbalanceOrig = oldbalanceOrg - amount if type_ in ('PAYMENT', 'DEBIT') else oldbalanceOrg + amount
                nameOrig = f'{customer_prefix}{random.randint(10000, 99999)}'
                nameDest = f'{merchant_prefix if type_ == "PAYMENT" else customer_prefix}{random.randint(10000, 99999)}'
                oldbalanceDest = round(random.uniform(0.0, 10000.0), 2)
                newbalanceDest = oldbalanceDest
                isFraud = 0
            
            elif category == 'grey':
                # Medium/high amounts, suspicious types, but doesn't fully empty the account.
                # These will have a mix of flags that should place them in the 0.30 to 0.65 range.
                type_ = random.choice(['TRANSFER', 'CASH_OUT'])
                amount = round(random.uniform(40000.0, 150000.0), 2)
                oldbalanceOrg = round(random.uniform(amount * 1.05, amount * 2.5), 2)
                newbalanceOrig = oldbalanceOrg - amount
                nameOrig = f'{customer_prefix}{random.randint(10000, 99999)}'
                nameDest = f'{customer_prefix}{random.randint(10000, 99999)}'
                oldbalanceDest = round(random.uniform(0.0, 5000.0), 2)
                newbalanceDest = oldbalanceDest + amount if type_ == 'CASH_OUT' else oldbalanceDest
                isFraud = random.choices([0, 1], weights=[0.7, 0.3])[0]
            
            else:
                # Obvious fraud: High amount transfers that completely drain the account.
                type_ = random.choice(['TRANSFER', 'CASH_OUT'])
                amount = round(random.uniform(250000.0, 950000.0), 2)
                oldbalanceOrg = amount # 100% drained
                newbalanceOrig = 0.0
                nameOrig = f'{customer_prefix}{random.randint(10000, 99999)}'
                nameDest = f'{customer_prefix}{random.randint(10000, 99999)}'
                oldbalanceDest = 0.0
                newbalanceDest = oldbalanceDest + amount if type_ == 'CASH_OUT' else oldbalanceDest
                isFraud = 1
                
            writer.writerow([step, type_, amount, nameOrig, oldbalanceOrg, newbalanceOrig, nameDest, oldbalanceDest, newbalanceDest, isFraud, 0])

if __name__ == '__main__':
    generate_dataset(1000, 'large_test_dataset.csv')
    print("Dataset generated successfully.")
