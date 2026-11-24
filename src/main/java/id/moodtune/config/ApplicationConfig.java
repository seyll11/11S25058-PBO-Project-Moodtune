package id.moodtune.config;

import id.moodtune.domain.port.MusicPersistencePort;
import id.moodtune.usecase.MusicService;
import id.moodtune.usecase.port.TransactionBoundary;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApplicationConfig {
    @Bean
    MusicService musicService(MusicPersistencePort persistence, TransactionBoundary transactions) {
        return new MusicService(persistence, transactions);
    }
}
