package id.moodtune.adapter.transaction;

import id.moodtune.usecase.port.TransactionBoundary;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.function.Supplier;

@Component
public class SpringTransactionBoundary implements TransactionBoundary {
    private final TransactionTemplate transactions;

    public SpringTransactionBoundary(PlatformTransactionManager transactionManager) {
        this.transactions = new TransactionTemplate(transactionManager);
    }

    @Override
    public <T> T execute(Supplier<T> operation) {
        return transactions.execute(status -> operation.get());
    }

    @Override
    public void execute(Runnable operation) {
        transactions.executeWithoutResult(status -> operation.run());
    }
}
